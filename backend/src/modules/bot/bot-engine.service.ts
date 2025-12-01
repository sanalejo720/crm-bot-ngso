import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotFlow, BotFlowStatus } from './entities/bot-flow.entity';
import { BotNode, BotNodeType } from './entities/bot-node.entity';
import { MessagesService } from '../messages/messages.service';
import { ChatsService } from '../chats/chats.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { DebtorsService } from '../debtors/debtors.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
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
    private messagesService: MessagesService,
    private chatsService: ChatsService,
    private whatsappService: WhatsappService,
    private debtorsService: DebtorsService,
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

    // Inicializar variables del flujo
    const variables = this.initializeVariables(flow);

    // Cargar datos del deudor si está disponible
    if (chat.client) {
      const debtor = await this.loadDebtorData(chat.client.phone);
      if (debtor) {
        variables['debtor'] = debtor;
        this.logger.log(`📋 Datos del deudor cargados: ${debtor.fullName}`);
      } else {
        // Si no hay deudor, crear estructura con valores por defecto
        variables['debtor'] = {
          fullName: '[No encontrado]',
          documentType: '[Desconocido]',
          documentNumber: '[Desconocido]',
          phone: chat.client.phone || '[No disponible]',
          debtAmount: 0,
          daysOverdue: 0,
          status: 'desconocido',
          metadata: {
            producto: '[No disponible]',
            fechaVencimiento: '[No disponible]',
          },
        };
        this.logger.log(`⚠️ No se encontró deudor para teléfono ${chat.client.phone}, usando valores por defecto`);
      }
    }

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
      // Enviar mensaje a través de WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        processedMessage,
        MessageType.TEXT,
      );

      // Crear registro del mensaje como BOT
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: processedMessage,
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

    // Si hay siguiente nodo, continuar automáticamente
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

    // Construir mensaje de menú
    const menuText = options
      .map((opt: any, index: number) => `${index + 1}. ${opt.label}`)
      .join('\n');

    await this.messagesService.create({
      chatId,
      type: MessageType.TEXT,
      direction: MessageDirection.OUTBOUND,
      senderType: MessageSenderType.BOT,
      content: menuText,
    });

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
      // Enviar mensaje a través de WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        processedMessage,
        MessageType.TEXT,
      );

      // Crear registro del mensaje como BOT
      const savedMessage = await this.messagesService.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: processedMessage,
        externalId: result.messageId,
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
   */
  private async executeTransferNode(chatId: string, node: BotNode): Promise<void> {
    this.logger.log(`Transfiriendo chat ${chatId} a agente humano`);

    const message = node.config.message || 'Perfecto, en un momento uno de nuestros asesores será asignado a tu caso para ayudarte con tu solicitud. ⏳\n\nPor favor espera un momento mientras te conectamos con un especialista.';
    const chat = await this.chatsService.findOne(chatId);
    const session = this.sessions.get(chatId);
    const processedMessage = this.replaceVariables(message, session?.variables);

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

    // Actualizar chat a estado ACTIVE (esperando asignación)
    await this.chatsService.update(chatId, {
      status: ChatStatus.ACTIVE,
      botContext: {
        ...session,
        transferredToAgent: true,
      },
    });

    this.logger.log(`✅ Chat ${chatId} transferido a estado ACTIVE - Esperando asignación de asesor`);

    // Limpiar sesión del bot
    this.sessions.delete(chatId);
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
    const inputNum = parseInt(userInput.trim());

    if (isNaN(inputNum) || inputNum < 1 || inputNum > options.length) {
      return null; // Input inválido
    }

    return options[inputNum - 1].nextNodeId;
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
    }

    return node.nextNodeId;
  }

  /**
   * Manejar condiciones
   */
  private handleCondition(node: BotNode, session: BotSession): string | null {
    const conditions = node.config.conditions || [];
    // La variable a evaluar está en node.config.variable, NO en cada condition
    const variableName = node.config.variable;

    this.logger.log(`🔍 Evaluando condición en nodo: ${node.name}`);
    this.logger.log(`   Variable a evaluar: ${variableName}`);
    this.logger.log(`   Variables disponibles:`, session.variables);

    // Obtener el valor de la variable UNA VEZ
    const variableValue = session.variables[variableName];
    this.logger.log(`   Valor actual de "${variableName}": "${variableValue}"`);

    for (const condition of conditions) {
      this.logger.log(`   Evaluando: ${variableValue} ${condition.operator} ${condition.value}`);

      let matches = false;

      switch (condition.operator) {
        case 'equals':
          matches = String(variableValue) === String(condition.value);
          break;
        case 'contains':
          matches = String(variableValue).includes(String(condition.value));
          break;
        case 'contains_ignore_case':
          matches = String(variableValue).toLowerCase().includes(String(condition.value).toLowerCase());
          break;
        case 'greater':
          matches = Number(variableValue) > Number(condition.value);
          break;
        case 'less':
          matches = Number(variableValue) < Number(condition.value);
          break;
      }

      if (matches) {
        this.logger.log(`   ✅ Match encontrado! Siguiente nodo: ${condition.nextNodeId}`);
        return condition.nextNodeId;
      }
    }

    // Usar elseNodeId si existe en la config, sino usar nextNodeId
    const fallbackNodeId = node.config.elseNodeId || node.nextNodeId;
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
   * Cargar datos del deudor
   */
  private async loadDebtorData(phone: string): Promise<any | null> {
    try {
      // Normalizar teléfono: remover @c.us y prefijos
      const normalizedPhone = phone
        .replace(/@c\.us$/, '')
        .replace(/^57/, '')
        .replace(/^\+57/, '')
        .replace(/^0/, '');

      this.logger.log(`🔍 Buscando deudor con teléfono normalizado: ${normalizedPhone} (original: ${phone})`);

      // Buscar con teléfono normalizado
      let debtor = await this.debtorsService.findByPhone(normalizedPhone);
      
      // Si no encuentra, intentar con teléfono original
      if (!debtor && phone !== normalizedPhone) {
        debtor = await this.debtorsService.findByPhone(phone);
      }
      
      if (!debtor) {
        this.logger.warn(`❌ No se encontró deudor con teléfono: ${phone} ni ${normalizedPhone}`);
        return null;
      }

      this.logger.log(`✅ Deudor encontrado: ${debtor.fullName}`);
      if (!debtor) return null;

      return {
        fullName: debtor.fullName,
        documentType: debtor.documentType || 'CC',
        documentNumber: debtor.documentNumber,
        phone: debtor.phone,
        debtAmount: debtor.debtAmount,
        daysOverdue: debtor.daysOverdue,
        status: debtor.status,
        metadata: debtor.metadata || {},
      };
    } catch (error) {
      this.logger.error(`Error cargando datos del deudor: ${error.message}`);
      return null;
    }
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
