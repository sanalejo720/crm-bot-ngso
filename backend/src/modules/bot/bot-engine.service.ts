import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BotFlow, BotFlowStatus } from './entities/bot-flow.entity';
import { BotNode, BotNodeType } from './entities/bot-node.entity';
import { MessagesService } from '../messages/messages.service';
import { ChatsService } from '../chats/chats.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { DebtorsService } from '../debtors/debtors.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import {
  MessageType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
} from '../messages/entities/message.entity';

export interface BotSession {
  chatId: string;
  flowId: string;
  currentNodeId: string;
  variables: Record<string, any>;
  createdAt: Date;
  lastActivityAt: Date;
}

@Injectable()
export class BotEngineService {
  private readonly logger = new Logger(BotEngineService.name);
  private sessions: Map<string, BotSession> = new Map();

  constructor(
    @InjectRepository(BotFlow)
    private botFlowRepository: Repository<BotFlow>,
    @InjectRepository(BotNode)
    private botNodeRepository: Repository<BotNode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private messagesService: MessagesService,
    private chatsService: ChatsService,
    private whatsappService: WhatsappService,
    private debtorsService: DebtorsService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Iniciar flujo de bot para un chat
   */
  async startFlow(chatId: string, flowId: string): Promise<void> {
    this.logger.log(`Iniciando flujo ${flowId} para chat ${chatId}`);

    const flow = await this.botFlowRepository.findOne({
      where: { id: flowId, status: BotFlowStatus.ACTIVE },
      relations: ['nodes'],
    });

    if (!flow) {
      throw new NotFoundException(`Flujo de bot ${flowId} no encontrado o inactivo`);
    }

    if (!flow.startNodeId) {
      throw new Error('El flujo no tiene nodo inicial configurado');
    }

    // Obtener el chat con sus relaciones
    const chat = await this.chatsService.findOne(chatId);

    // Inicializar variables del flujo básicas
    const variables = this.initializeVariables(flow);
    
    // Agregar variables del chat
    variables['clientName'] = chat.contactName || 'Cliente';
    variables['clientPhone'] = chat.contactPhone;
    variables['debtorFound'] = false; // Se actualizará cuando proporcione documento

    // Crear sesión
    const session: BotSession = {
      chatId,
      flowId,
      currentNodeId: flow.startNodeId,
      variables,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(chatId, session);

    // Actualizar chat
    await this.chatsService.update(chatId, {
      status: ChatStatus.BOT,
      botContext: {
        sessionId: chatId,
        flowId,
        currentNodeId: flow.startNodeId,
        variables: session.variables,
        transferredToAgent: false,
      },
    });

    // Ejecutar nodo inicial
    await this.executeNode(chatId, flow.startNodeId);
  }

  /**
   * Procesar respuesta del usuario
   */
  async processUserInput(chatId: string, userInput: string): Promise<void> {
    const session = this.sessions.get(chatId);

    if (!session) {
      this.logger.warn(`No hay sesión activa para chat ${chatId}`);
      return;
    }

    session.lastActivityAt = new Date();

    const currentNode = await this.botNodeRepository.findOne({
      where: { id: session.currentNodeId },
    });

    if (!currentNode) {
      throw new NotFoundException(`Nodo ${session.currentNodeId} no encontrado`);
    }

    // Procesar según tipo de nodo
    let nextNodeId: string | null = null;

    switch (currentNode.type) {
      case BotNodeType.MESSAGE:
        // Caso especial: mensaje con botones que espera respuesta
        if (currentNode.config.useButtons && currentNode.config.buttons) {
          // Guardar respuesta del usuario
          session.variables['user_response'] = userInput;
          
          // Buscar el botón que coincida con la respuesta
          const buttons = currentNode.config.buttons;
          const inputLower = userInput.toLowerCase().trim();
          
          const matchedButton = buttons.find((btn: any) => 
            btn.id?.toLowerCase() === inputLower ||
            btn.text?.toLowerCase() === inputLower ||
            btn.value?.toLowerCase() === inputLower ||
            btn.text?.toLowerCase().includes(inputLower) ||
            inputLower.includes(btn.text?.toLowerCase() || '')
          );
          
          if (matchedButton) {
            session.variables['selected_button'] = matchedButton.id || matchedButton.value;
            this.logger.log(`🔘 Botón seleccionado: ${matchedButton.text} (ID: ${matchedButton.id})`);
          }
          
          // Si hay responseNodeId (normalmente un CONDITION), usarlo
          if (currentNode.config.responseNodeId) {
            nextNodeId = currentNode.config.responseNodeId;
          } else {
            nextNodeId = currentNode.nextNodeId;
          }
        } else {
          nextNodeId = currentNode.nextNodeId;
        }
        break;

      case BotNodeType.MENU:
        nextNodeId = this.handleMenuInput(currentNode, userInput);
        break;

      case BotNodeType.INPUT:
        nextNodeId = await this.handleTextInput(currentNode, userInput, session);
        break;

      case BotNodeType.CONDITION:
        // Guardar el input del usuario para que pueda ser evaluado por la condición
        session.variables['user_response'] = userInput;
        nextNodeId = this.handleCondition(currentNode, session);
        break;

      default:
        nextNodeId = currentNode.nextNodeId;
    }

    if (!nextNodeId) {
      this.logger.warn(`No se encontró siguiente nodo para ${currentNode.id}`);
      return;
    }

    // Actualizar sesión
    session.currentNodeId = nextNodeId;
    session.lastActivityAt = new Date();
    this.sessions.set(chatId, session);

    // Actualizar también el botContext en el chat
    await this.chatsService.update(chatId, {
      botContext: {
        ...session,
        sessionId: chatId,
      },
    });

    this.logger.log(`➡️ Procesando respuesta, avanzando a nodo: ${nextNodeId}`);

    // Ejecutar siguiente nodo
    await this.executeNode(chatId, nextNodeId);
  }

  /**
   * Ejecutar un nodo del flujo
   */
  private async executeNode(chatId: string, nodeId: string): Promise<void> {
    const node = await this.botNodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw new NotFoundException(`Nodo ${nodeId} no encontrado`);
    }

    this.logger.log(`Ejecutando nodo ${node.name} (${node.type}) para chat ${chatId}`);

    switch (node.type) {
      case BotNodeType.MESSAGE:
        await this.executeMessageNode(chatId, node);
        break;

      case BotNodeType.MENU:
        await this.executeMenuNode(chatId, node);
        break;

      case BotNodeType.INPUT:
        await this.executeInputNode(chatId, node);
        break;

      case BotNodeType.CONDITION:
        // Los nodos CONDITION no se ejecutan automáticamente
        // Solo se procesan cuando llega input del usuario en processUserInput()
        this.logger.log(`⏸️ Nodo CONDITION alcanzado. Esperando respuesta del usuario...`);
        break;

      case BotNodeType.API_CALL:
        await this.executeApiCallNode(chatId, node);
        break;

      case BotNodeType.TRANSFER_AGENT:
        await this.executeTransferNode(chatId, node);
        break;

      case BotNodeType.END:
        await this.executeEndNode(chatId);
        break;

      default:
        this.logger.warn(`Tipo de nodo no soportado: ${node.type}`);
    }
  }

  /**
   * Ejecutar nodo de mensaje
   */
  private async executeMessageNode(chatId: string, node: BotNode): Promise<void> {
    const message = node.config.message;

    if (!message) {
      this.logger.warn('Nodo de mensaje sin contenido');
      return;
    }

    const chat = await this.chatsService.findOne(chatId);
    const processedMessage = this.replaceVariables(message, this.sessions.get(chatId)?.variables);

    try {
      let result;
      let savedContent = processedMessage;

      // Verificar si debe usar botones interactivos
      if (node.config.useButtons && node.config.buttons && node.config.buttons.length > 0) {
        const buttons = node.config.buttons.map(btn => ({
          id: btn.id,
          text: btn.text,
        }));

        const title = node.config.buttonTitle || 'Seleccione una opción';
        
        this.logger.log(`📤 Enviando mensaje con botones: ${buttons.length} botones`);
        
        result = await this.whatsappService.sendButtonsMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          title,
          processedMessage,
          buttons,
        );

        // Guardar el contenido con indicación de botones
        savedContent = `${processedMessage}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
      } else {
        // Enviar mensaje de texto normal
        result = await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          processedMessage,
          MessageType.TEXT,
        );
      }

      // Crear registro del mensaje como BOT
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: savedContent,
        externalId: result.messageId,
      });

      // Actualizar estado a enviado
      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.SENT);

      this.logger.log(`Bot envió mensaje a ${chat.contactPhone}: "${processedMessage.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error(`Error enviando mensaje del bot: ${error.message}`);
      
      // Crear registro del mensaje con estado pendiente
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: processedMessage,
      });

      // Marcar como fallido
      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.FAILED, error.message);
    }

    // Si el mensaje tiene botones con responseNodeId, esperar respuesta del usuario
    // y configurar el nodo de respuesta para procesar el input
    if (node.config.useButtons && node.config.responseNodeId) {
      const session = this.sessions.get(chatId);
      if (session) {
        // El siguiente nodo a procesar será el responseNodeId (normalmente un CONDITION)
        session.currentNodeId = node.config.responseNodeId;
        session.lastActivityAt = new Date();
        this.sessions.set(chatId, session);
        
        // Actualizar el botContext en el chat
        await this.chatsService.update(chatId, {
          botContext: {
            ...session,
            sessionId: chatId,
          },
        });
        
        this.logger.log(`🔘 Mensaje con botones enviado. Esperando respuesta del usuario...`);
        this.logger.log(`📍 Próximo nodo a procesar (responseNodeId): ${node.config.responseNodeId}`);
      }
      return; // NO avanzar automáticamente, esperar respuesta del usuario
    }

    // Si hay siguiente nodo y NO son botones con respuesta, continuar automáticamente
    if (node.nextNodeId) {
      const session = this.sessions.get(chatId);
      if (session) {
        session.currentNodeId = node.nextNodeId;
        session.lastActivityAt = new Date();
        this.sessions.set(chatId, session);
        
        // Actualizar también el botContext en el chat
        await this.chatsService.update(chatId, {
          botContext: {
            ...session,
            sessionId: chatId,
          },
        });
        
        this.logger.log(`⏭️ Avanzando automáticamente al nodo: ${node.nextNodeId}`);
        await this.executeNode(chatId, node.nextNodeId);
      }
    }
  }

  /**
   * Ejecutar nodo de menú
   */
  private async executeMenuNode(chatId: string, node: BotNode): Promise<void> {
    const options = node.config.options || [];

    if (options.length === 0) {
      this.logger.warn('Nodo de menú sin opciones');
      return;
    }

    const chat = await this.chatsService.findOne(chatId);
    const session = this.sessions.get(chatId);

    try {
      let result;
      let savedContent: string;

      // Verificar si debe usar botones interactivos (máximo 3 botones en WhatsApp)
      if (options.length <= 3) {
        // Usar botones para 3 opciones o menos
        const buttons = options.map((opt: any) => ({
          id: opt.id || opt.value,
          text: opt.label.substring(0, 20), // WhatsApp limita a 20 caracteres
        }));

        const title = node.config.buttonTitle || 'Menú de opciones';
        const description = node.config.message || 'Por favor seleccione una opción:';
        const processedDesc = this.replaceVariables(description, session?.variables);

        this.logger.log(`📤 Enviando menú con ${buttons.length} botones`);

        result = await this.whatsappService.sendButtonsMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          title,
          processedDesc,
          buttons,
        );

        savedContent = `${processedDesc}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
      } else {
        // Para más de 3 opciones, usar lista
        const rows = options.map((opt: any) => ({
          id: opt.id || opt.value,
          title: opt.label.substring(0, 24), // WhatsApp limita a 24 caracteres
          description: opt.description || '',
        }));

        const title = node.config.buttonTitle || 'Menú de opciones';
        const description = node.config.message || 'Por favor seleccione una opción:';
        const processedDesc = this.replaceVariables(description, session?.variables);

        this.logger.log(`📤 Enviando menú como lista con ${rows.length} opciones`);

        result = await this.whatsappService.sendListMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          title,
          processedDesc,
          'Ver opciones',
          [{ title: 'Opciones', rows }],
        );

        savedContent = `${processedDesc}\n\n[Lista: ${rows.map(r => r.title).join(' | ')}]`;
      }

      // Crear registro del mensaje como BOT
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: savedContent,
        externalId: result?.messageId,
      });

      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.SENT);
      this.logger.log(`✅ Menú enviado exitosamente`);
    } catch (error) {
      this.logger.error(`Error enviando menú: ${error.message}`);
      
      // Fallback: enviar como texto plano
      const menuText = options
        .map((opt: any, index: number) => `${index + 1}. ${opt.label}`)
        .join('\n');

      try {
        await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          menuText,
          MessageType.TEXT,
        );

        await this.messagesService.create({
          chatId,
          type: MessageType.TEXT,
          direction: MessageDirection.OUTBOUND,
          senderType: MessageSenderType.BOT,
          content: menuText,
        });
      } catch (fallbackError) {
        this.logger.error(`Error en fallback de menú: ${fallbackError.message}`);
      }
    }

    // Esperar respuesta del usuario (no continuar automáticamente)
  }

  /**
   * Ejecutar nodo de input
   */
  private async executeInputNode(chatId: string, node: BotNode): Promise<void> {
    const message = node.config.message || '¿Cuál es tu respuesta?';
    const chat = await this.chatsService.findOne(chatId);
    const session = this.sessions.get(chatId);
    const processedMessage = this.replaceVariables(message, session?.variables);

    try {
      let result;
      let savedContent = processedMessage;

      // Verificar si debe usar botones interactivos
      if (node.config.useButtons && node.config.buttons && node.config.buttons.length > 0) {
        const buttons = node.config.buttons.map(btn => ({
          id: btn.id,
          text: btn.text,
        }));

        const title = node.config.buttonTitle || 'Responda';
        
        this.logger.log(`📤 Enviando input con botones: ${buttons.length} botones`);
        
        result = await this.whatsappService.sendButtonsMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          title,
          processedMessage,
          buttons,
        );

        savedContent = `${processedMessage}\n\n[Botones: ${buttons.map(b => b.text).join(' | ')}]`;
      } else {
        // Enviar mensaje de texto normal
        result = await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          processedMessage,
          MessageType.TEXT,
        );
      }

      // Crear registro del mensaje como BOT
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: savedContent,
        externalId: result?.messageId,
      });

      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.SENT);
      this.logger.log(`📝 Bot solicitó input: "${processedMessage.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error(`Error enviando solicitud de input: ${error.message}`);
    }

    // Esperar respuesta del usuario - no avanzar automáticamente
    this.logger.log(`⏸️ Nodo INPUT alcanzado. Esperando respuesta del usuario...`);
  }

  /**
   * Ejecutar nodo de condición
   */
  private async executeConditionNode(chatId: string, node: BotNode): Promise<void> {
    const session = this.sessions.get(chatId);
    if (!session) return;

    const nextNodeId = this.handleCondition(node, session);

    if (nextNodeId) {
      session.currentNodeId = nextNodeId;
      this.sessions.set(chatId, session);
      await this.executeNode(chatId, nextNodeId);
    }
  }

  /**
   * Ejecutar nodo de llamada API
   */
  private async executeApiCallNode(chatId: string, node: BotNode): Promise<void> {
    // Implementación simplificada - en producción usar axios
    this.logger.log('Ejecutando llamada API (no implementado)');

    if (node.nextNodeId) {
      const session = this.sessions.get(chatId);
      if (session) {
        session.currentNodeId = node.nextNodeId;
        await this.executeNode(chatId, node.nextNodeId);
      }
    }
  }

  /**
   * Ejecutar nodo de transferencia a agente
   * Incluye asignación automática si la campaña lo tiene habilitado
   */
  private async executeTransferNode(chatId: string, node: BotNode): Promise<void> {
    this.logger.log(`📤 Transfiriendo chat ${chatId} a agente humano`);

    const chat = await this.chatsService.findOne(chatId);
    const session = this.sessions.get(chatId);

    // Obtener campaña del chat (puede haber sido actualizada por búsqueda de deudor)
    let campaign: Campaign | null = null;
    if (chat.campaignId) {
      campaign = await this.campaignRepository.findOne({ where: { id: chat.campaignId } });
    }

    // Verificar si hay asignación automática habilitada
    const autoAssignment = campaign?.settings?.autoAssignment ?? false;
    let assignedAgent: User | null = null;

    if (autoAssignment && chat.campaignId) {
      this.logger.log(`🔄 Intentando asignación automática para campaña: ${campaign?.name || chat.campaignId}`);
      assignedAgent = await this.findAvailableAgentForCampaign(chat.campaignId);
    }

    // Preparar mensaje de transferencia
    let transferMessage: string;
    if (assignedAgent) {
      transferMessage = `✅ *¡Excelente!*\n\nHas sido asignado a *${assignedAgent.fullName}*, quien te ayudará con tu solicitud.\n\nEn un momento te contactará. 🙌`;
    } else {
      transferMessage = node.config.message || 'Perfecto, en un momento uno de nuestros asesores será asignado a tu caso para ayudarte con tu solicitud. ⏳\n\nPor favor espera un momento mientras te conectamos con un especialista.';
    }
    
    const processedMessage = this.replaceVariables(transferMessage, session?.variables);

    try {
      // Enviar mensaje de transferencia por WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        processedMessage,
        MessageType.TEXT,
      );

      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: processedMessage,
        externalId: result.messageId,
      });

      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.SENT);
      this.logger.log(`📤 Mensaje de transferencia enviado a ${chat.contactPhone}`);
    } catch (error) {
      this.logger.error(`Error enviando mensaje de transferencia: ${error.message}`);
    }

    // Procesar la asignación o poner en cola
    if (assignedAgent) {
      // Asignación automática exitosa
      await this.chatsService.update(chatId, {
        status: ChatStatus.ACTIVE,
        assignedAgentId: assignedAgent.id,
        assignedAt: new Date(),
        botContext: {
          ...session,
          transferredToAgent: true,
          autoAssigned: true,
          assignedAgentName: assignedAgent.fullName,
        },
      });

      // Incrementar contador de chats del agente
      await this.userRepository.increment(
        { id: assignedAgent.id },
        'currentChatsCount',
        1,
      );

      // Emitir evento de asignación
      this.eventEmitter.emit('chat.assigned', {
        chat,
        agent: assignedAgent,
        autoAssigned: true,
      });

      this.logger.log(`✅ Chat ${chatId} asignado automáticamente a ${assignedAgent.fullName}`);
    } else {
      // Poner en cola de espera
      await this.chatsService.update(chatId, {
        status: ChatStatus.WAITING,
        subStatus: 'waiting_for_agent',
        botContext: {
          ...session,
          transferredToAgent: true,
          autoAssigned: false,
        },
      });

      this.logger.log(`📋 Chat ${chatId} puesto en cola de espera para asignación manual`);
    }

    // Limpiar sesión del bot
    this.sessions.delete(chatId);
  }

  /**
   * Buscar agente disponible para una campaña específica
   */
  private async findAvailableAgentForCampaign(campaignId: string): Promise<User | null> {
    // Primero buscar agentes asignados directamente a la campaña
    let agent = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isAgent = :isAgent', { isAgent: true })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.agentState = :agentState', { agentState: 'available' })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats')
      .andWhere('user.campaignId = :campaignId', { campaignId })
      .orderBy('user.currentChatsCount', 'ASC')
      .getOne();

    if (agent) {
      this.logger.log(`✅ Agente encontrado (campaña directa): ${agent.fullName}`);
      return agent;
    }

    // Si no hay agentes de la campaña directa, buscar en relación muchos a muchos
    agent = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_campaigns', 'uc', 'uc.userId = user.id')
      .where('user.isAgent = :isAgent', { isAgent: true })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.agentState = :agentState', { agentState: 'available' })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats')
      .andWhere('uc.campaignId = :campaignId', { campaignId })
      .orderBy('user.currentChatsCount', 'ASC')
      .getOne();

    if (agent) {
      this.logger.log(`✅ Agente encontrado (user_campaigns): ${agent.fullName}`);
      return agent;
    }

    this.logger.warn(`⚠️ No hay agentes disponibles para campaña ${campaignId}`);
    return null;
  }

  /**
   * Ejecutar nodo de fin
   */
  private async executeEndNode(chatId: string): Promise<void> {
    this.logger.log(`Finalizando flujo para chat ${chatId}`);

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: '¡Gracias por tu tiempo! Si necesitas más ayuda, no dudes en escribirnos.',
    });

    // Cerrar chat
    await this.chatsService.update(chatId, {
      status: ChatStatus.RESOLVED,
    });

    // Limpiar sesión
    this.sessions.delete(chatId);
  }

  /**
   * Manejar input de menú
   */
  private handleMenuInput(node: BotNode, userInput: string): string | null {
    const options = node.config.options || [];
    const inputTrimmed = userInput.trim().toLowerCase();
    const inputNum = parseInt(inputTrimmed);

    // 1. Buscar por número (1, 2, 3...)
    if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= options.length) {
      this.logger.log(`🎯 Menú: seleccionado por número ${inputNum}`);
      return options[inputNum - 1].nextNodeId;
    }

    // 2. Buscar por ID del botón (para botones interactivos)
    const matchById = options.find((opt: any) => 
      (opt.id && opt.id.toLowerCase() === inputTrimmed) ||
      (opt.value && opt.value.toLowerCase() === inputTrimmed)
    );
    if (matchById) {
      this.logger.log(`🎯 Menú: seleccionado por ID "${inputTrimmed}"`);
      return matchById.nextNodeId;
    }

    // 3. Buscar por texto del label (para respuestas de texto que coincidan)
    const matchByLabel = options.find((opt: any) => 
      opt.label && opt.label.toLowerCase() === inputTrimmed
    );
    if (matchByLabel) {
      this.logger.log(`🎯 Menú: seleccionado por label "${inputTrimmed}"`);
      return matchByLabel.nextNodeId;
    }

    // 4. Buscar por coincidencia parcial en label
    const matchByPartialLabel = options.find((opt: any) => 
      opt.label && opt.label.toLowerCase().includes(inputTrimmed)
    );
    if (matchByPartialLabel) {
      this.logger.log(`🎯 Menú: seleccionado por coincidencia parcial "${inputTrimmed}"`);
      return matchByPartialLabel.nextNodeId;
    }

    this.logger.warn(`⚠️ Menú: entrada "${inputTrimmed}" no coincide con ninguna opción`);
    return null; // Input inválido
  }

  /**
   * Manejar input de texto
   */
  private async handleTextInput(
    node: BotNode,
    userInput: string,
    session: BotSession,
  ): Promise<string | null> {
    const variableName = node.config.variableName;
    const validation = node.config.validation;

    // Validar input
    if (validation) {
      if (validation.required && !userInput.trim()) {
        await this.messagesService.create({
          chatId: session.chatId,
          type: MessageType.TEXT,
          direction: MessageDirection.OUTBOUND,
          senderType: MessageSenderType.BOT,
          content: validation.errorMessage || 'Este campo es requerido',
        });
        return null;
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(userInput)) {
          await this.messagesService.create({
            chatId: session.chatId,
            type: MessageType.TEXT,
            direction: MessageDirection.OUTBOUND,
            senderType: MessageSenderType.BOT,
            content: validation.errorMessage || 'Formato inválido',
          });
          return null;
        }
      }
    }

    // Guardar en variable
    if (variableName) {
      session.variables[variableName] = userInput;
      
      // Si capturamos un documento, buscar automáticamente al deudor
      if (variableName === 'documento_validado' || variableName === 'documentNumber' || variableName === 'documento') {
        this.logger.log(`🔍 Capturado documento: ${userInput}, buscando deudor...`);
        
        // Limpiar el documento (remover puntos, guiones, espacios)
        const cleanDocument = userInput.replace(/[.\-\s]/g, '');
        
        // Intentar buscar por CC primero
        let debtor = await this.debtorsService.findByDocument('CC' as any, cleanDocument);
        
        // Si no encuentra, intentar buscar sin tipo de documento específico
        if (!debtor) {
          // Buscar directamente por número de documento sin importar el tipo
          debtor = await this.debtorsService.findByDocumentNumber(cleanDocument);
        }
        
        // Intentar sin ceros a la izquierda
        if (!debtor) {
          const docWithoutLeadingZeros = cleanDocument.replace(/^0+/, '');
          debtor = await this.debtorsService.findByDocumentNumber(docWithoutLeadingZeros);
        }
        
        if (debtor) {
          // Crear objeto anidado para que replaceVariables funcione correctamente
          session.variables.debtor = {
            id: debtor.id,
            fullName: debtor.fullName,
            documentType: debtor.documentType,
            documentNumber: debtor.documentNumber,
            phone: debtor.phone,
            email: debtor.email || '[No disponible]',
            debtAmount: this.formatCurrency(debtor.debtAmount),
            debtAmountRaw: debtor.debtAmount,
            initialDebtAmount: this.formatCurrency(debtor.initialDebtAmount),
            daysOverdue: debtor.daysOverdue,
            status: debtor.status,
            campaignId: debtor.campaignId,
            lastPaymentDate: '[No disponible]',
            producto: '[No disponible]',
            numeroCredito: '[No disponible]',
            fechaVencimiento: '[No disponible]',
          };
          
          // Manejar fecha de pago (puede ser Date, string o null)
          if (debtor.lastPaymentDate) {
            const paymentDate: any = debtor.lastPaymentDate;
            if (paymentDate instanceof Date) {
              session.variables.debtor.lastPaymentDate = paymentDate.toISOString().split('T')[0];
            } else if (typeof paymentDate === 'string') {
              session.variables.debtor.lastPaymentDate = paymentDate.split('T')[0];
            }
          }
          
          // Metadata adicional
          if (debtor.metadata) {
            session.variables.debtor.producto = debtor.metadata.producto || '[No disponible]';
            session.variables.debtor.numeroCredito = debtor.metadata.numeroCredito || '[No disponible]';
            session.variables.debtor.fechaVencimiento = debtor.metadata.fechaVencimiento || '[No disponible]';
          }
          
          session.variables.debtorFound = true;
          
          this.logger.log(`✅ Deudor encontrado: ${debtor.fullName} - ${debtor.documentType} ${debtor.documentNumber} - Deuda: ${session.variables.debtor.debtAmount}`);
          
          // Actualizar el chat con el deudor, campaña y nombre del contacto
          try {
            const updateData: any = { 
              debtorId: debtor.id,
              contactName: debtor.fullName, // Actualizar nombre del contacto
            };
            
            // Si el deudor tiene una campaña asignada, también actualizar la campaña del chat
            if (debtor.campaignId) {
              updateData.campaignId = debtor.campaignId;
              this.logger.log(`🔄 Actualizando chat con deudor ${debtor.fullName} y campaña ${debtor.campaignId}`);
            } else {
              this.logger.log(`🔄 Actualizando chat con deudor ${debtor.fullName}`);
            }
            
            await this.chatsService.update(session.chatId, updateData);
            
            // También actualizar variables del cliente
            session.variables.clientName = debtor.fullName;
          } catch (error) {
            this.logger.error(`Error actualizando chat con información del deudor: ${error.message}`);
          }
          
          // Actualizar última fecha de contacto del deudor
          await this.debtorsService.updateLastContacted(debtor.id);
        } else {
          this.logger.warn(`❌ No se encontró deudor con documento: ${cleanDocument}`);
          session.variables['debtorFound'] = false;
        }
      }
    }

    return node.nextNodeId;
  }

  /**
   * Manejar condiciones
   */
  private handleCondition(node: BotNode, session: BotSession): string | null {
    const conditions = node.config.conditions || [];
    
    this.logger.log(`🔍 Evaluando condición en nodo: ${node.name}`);
    this.logger.log(`   Variables disponibles:`, session.variables);
    
    // Obtener la respuesta del usuario (guardada en user_response)
    const userResponse = session.variables['user_response'];
    this.logger.log(`   Respuesta del usuario: "${userResponse}"`);

    for (const condition of conditions) {
      // Cada condición puede tener su propia variable O usar user_response
      const variableName = condition.variable || 'user_response';
      const variableValue = session.variables[variableName] || userResponse;
      
      this.logger.log(`   Evaluando: "${variableValue}" ${condition.operator} "${condition.value}"`);

      let matches = false;

      switch (condition.operator) {
        case 'equals':
          // Comparar ignorando mayúsculas/minúsculas y espacios
          const normalizedValue = String(variableValue || '').toLowerCase().trim();
          const normalizedCondition = String(condition.value || '').toLowerCase().trim();
          matches = normalizedValue === normalizedCondition;
          break;
        case 'contains':
          matches = String(variableValue || '').includes(String(condition.value || ''));
          break;
        case 'contains_ignore_case':
          matches = String(variableValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
          break;
        case 'greater':
          matches = Number(variableValue) > Number(condition.value);
          break;
        case 'less':
          matches = Number(variableValue) < Number(condition.value);
          break;
      }

      if (matches) {
        // Usar targetNodeId (de la configuración real) o nextNodeId
        const nextNode = condition.targetNodeId || condition.nextNodeId;
        this.logger.log(`   ✅ Match encontrado! Siguiente nodo: ${nextNode}`);
        return nextNode;
      }
    }

    // Usar defaultNodeId, elseNodeId o nextNodeId como fallback
    const fallbackNodeId = node.config.defaultNodeId || node.config.elseNodeId || node.nextNodeId;
    this.logger.log(`   ❌ Ninguna condición match. Usando fallback: ${fallbackNodeId}`);
    return fallbackNodeId;
  }

  /**
   * Inicializar variables del flujo
   */
  private initializeVariables(flow: BotFlow): Record<string, any> {
    const variables: Record<string, any> = {};

    if (flow.variables) {
      Object.entries(flow.variables).forEach(([key, config]: [string, any]) => {
        variables[key] = config.defaultValue || null;
      });
    }

    return variables;
  }

  /**
   * Reemplazar variables en texto
   */
  private replaceVariables(text: string, variables?: Record<string, any>): string {
    if (!variables) {
      // Si no hay variables, reemplazar todos los placeholders con texto informativo
      return text.replace(/\{\{([^}]+)\}\}/g, '[No disponible]');
    }

    let result = text;

    // Reemplazar variables con rutas anidadas (ej: {{debtor.fullName}}, {{debtor.metadata.producto}})
    const regex = /\{\{([^}]+)\}\}/g;
    result = result.replace(regex, (match, path) => {
      const keys = path.split('.');
      let value: any = variables;

      // Navegar por la ruta de propiedades
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          // Si no se encuentra la ruta, retornar texto informativo
          return '[No disponible]';
        }
      }

      // Formatear valores especiales
      if (typeof value === 'number') {
        // Formatear números grandes como moneda
        if (value >= 1000) {
          return value.toLocaleString('es-CO');
        }
      }

      return value != null ? String(value) : '[No disponible]';
    });

    return result;
  }

  /**
   * Formatear moneda en formato colombiano
   */
  private formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '$0';
    return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  /**
   * Verificar si hay una sesión activa para un chat
   */
  hasActiveSession(chatId: string): boolean {
    return this.sessions.has(chatId);
  }

  /**
   * Limpiar sesiones inactivas
   */
  cleanInactiveSessions(maxInactivityMinutes: number = 30): void {
    const now = new Date();

    this.sessions.forEach((session, chatId) => {
      const inactiveMinutes =
        (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;

      if (inactiveMinutes > maxInactivityMinutes) {
        this.logger.log(`Limpiando sesión inactiva: ${chatId}`);
        this.sessions.delete(chatId);
      }
    });
  }
}
