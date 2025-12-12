import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { BotFlow } from './entities/bot-flow.entity';
import { BotNode, BotNodeType } from './entities/bot-node.entity';
import { Chat } from '../chats/entities/chat.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { MessageType, MessageDirection, MessageStatus, MessageSenderType } from '../messages/entities/message.entity';
import { MessagesService } from '../messages/messages.service';

interface BotSession {
  chatId: string;
  flowId: string;
  currentNodeId: string;
  variables: Record<string, any>;
  startedAt: Date;
  waitingForInput?: boolean;
}

@Injectable()
export class BotExecutorService {
  private readonly logger = new Logger(BotExecutorService.name);
  private botSessions: Map<string, BotSession> = new Map();

  constructor(
    @InjectRepository(BotFlow)
    private botFlowRepository: Repository<BotFlow>,
    @InjectRepository(BotNode)
    private botNodeRepository: Repository<BotNode>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('🚀 [BOT-EXECUTOR] BotExecutorService INICIADO Y REGISTRADO');
    this.logger.log('🔔 [BOT-EXECUTOR] Listeners de eventos registrados: message.created, chat.closed');
  }

  /**
   * Escuchar mensajes creados (después de guardarse en BD)
   */
  @OnEvent('message.created')
  async handleMessageCreated(payload: any) {
    try {
      const { message, chat } = payload;

      // Solo procesar mensajes entrantes
      if (message.direction !== 'inbound') {
        return;
      }

      this.logger.log(`🤖 Mensaje entrante recibido de ${chat.contactPhone} - Chat: ${chat.id} - Estado: ${chat.status}`);

      // Si el chat está cerrado, reactivarlo automáticamente para el bot
      if (chat.status === 'closed') {
        this.logger.log(`🔄 Chat ${chat.id} estaba cerrado, reactivando para bot...`);
        await this.chatRepository.update(chat.id, {
          status: () => "'bot'",
          closedAt: null,
        });
        // Actualizar el objeto chat
        chat.status = 'bot';
      }

      // Verificar si tiene usuario asignado
      if (chat.assignedAgentId) {
        this.logger.log(`Chat ${chat.id} tiene agente asignado, bot no responde`);
        return;
      }

      // Cargar campaign si no está incluida
      if (!chat.campaign) {
        const chatWithCampaign = await this.chatRepository.findOne({
          where: { id: chat.id },
          relations: ['campaign', 'whatsappNumber'],
        });
        
        if (!chatWithCampaign) {
          this.logger.log(`Chat no encontrado: ${chat.id}`);
          return;
        }
        
        chat.campaign = chatWithCampaign.campaign;
        chat.whatsappNumber = chatWithCampaign.whatsappNumber;
      }

      // Procesar con el bot
      const result = await this.processIncomingMessage(chat.id, message.content);

      // Enviar respuesta si aplica
      if (result.shouldRespond && result.response) {
        await this.sendBotMessage(chat, result.response);
      }

      // Transferir a agente si se requiere
      if (result.shouldTransferToAgent) {
        this.logger.log(`📋 Cambiando estado del chat ${chat.id} a 'waiting' (en cola para asignación)`);
        await this.chatRepository.update(chat.id, {
          status: () => "'waiting'",
        });
      }
    } catch (error) {
      this.logger.error(`Error manejando mensaje: ${error.message}`, error.stack);
    }
  }

  /**
   * Escuchar cierre de chats para reiniciar bot
   */
  @OnEvent('chat.closed')
  async handleChatClosed(chat: any) {
    const chatId = chat.id || chat.chatId;
    this.logger.log(`🔔 [BOT-EXECUTOR] Evento chat.closed recibido para chat ${chatId}`);
    
    try {
      this.logger.log(`🔍 [BOT-EXECUTOR] Cargando chat ${chatId} con relaciones...`);
      // Cargar chat completo con relaciones necesarias
      const chatWithRelations = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['campaign', 'whatsappNumber'],
      });

      if (!chatWithRelations) {
        this.logger.error(`❌ [BOT-EXECUTOR] Chat ${chatId} no encontrado en handleChatClosed`);
        return;
      }

      this.logger.log(`✅ [BOT-EXECUTOR] Chat cargado: ${chatWithRelations.contactPhone}, Número WA ID: ${chatWithRelations.whatsappNumberId}`);

      // 1. Enviar mensaje de despedida al cliente
      const farewellMessage = `✅ *Gracias por contactarnos*

Su conversación ha sido cerrada. Si necesita asistencia adicional, puede escribirnos nuevamente y el sistema le atenderá automáticamente.

*Equipo de Soporte NGSO*`;

      this.logger.log(`📤 [BOT-EXECUTOR] Enviando mensaje de despedida al chat ${chatId}...`);
      await this.sendBotMessage(chatWithRelations, farewellMessage);
      this.logger.log(`💬 [BOT-EXECUTOR] Mensaje de despedida enviado al chat ${chatId}`);

      // 2. Resetear sesión del bot para que esté listo cuando el cliente vuelva a escribir
      this.logger.log(`🔄 [BOT-EXECUTOR] Reseteando sesión del bot para chat ${chatId}...`);
      await this.resetBotSession(chatId);
      this.logger.log(`✅ [BOT-EXECUTOR] Sesión del bot reseteada para chat ${chatId}`);
    } catch (error) {
      this.logger.error(`💥 [BOT-EXECUTOR] Error en handleChatClosed para chat ${chatId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesar mensaje entrante y ejecutar bot si aplica
   */
  async processIncomingMessage(chatId: string, message: string): Promise<{
    shouldRespond: boolean;
    response?: string;
    shouldTransferToAgent?: boolean;
  }> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['campaign'],
      });

      if (!chat || !chat.campaign) {
        return { shouldRespond: false };
      }

      // Verificar si la campaña tiene bot habilitado
      const campaign = chat.campaign;
      if (!campaign.settings?.botEnabled || !campaign.settings?.botFlowId) {
        return { shouldRespond: false };
      }

      // Obtener o crear sesión de bot
      let session = this.botSessions.get(chatId);
      
      if (!session) {
        // Crear nueva sesión
        const flow = await this.botFlowRepository.findOne({
          where: { id: campaign.settings.botFlowId },
          relations: ['nodes'],
        });

        if (!flow || flow.status !== 'active') {
          this.logger.warn(`Flujo ${campaign.settings.botFlowId} no encontrado o inactivo`);
          return { shouldRespond: false };
        }

        const startNode = flow.nodes.find(node => node.id === flow.startNodeId);
        if (!startNode) {
          this.logger.error(`Nodo inicial no encontrado en flujo ${flow.id}`);
          return { shouldRespond: false };
        }

        session = {
          chatId,
          flowId: flow.id,
          currentNodeId: startNode.id,
          variables: {},
          startedAt: new Date(),
        };
        this.botSessions.set(chatId, session);
        
        this.logger.log(`🤖 Bot iniciado para chat ${chatId}`);
      }

      // Ejecutar el nodo actual
      return await this.executeCurrentNode(session, message);

    } catch (error) {
      this.logger.error(`Error procesando mensaje para bot: ${error.message}`, error.stack);
      return { shouldRespond: false };
    }
  }

  /**
   * Ejecutar el nodo actual del flujo
   */
  private async executeCurrentNode(
    session: BotSession,
    userMessage: string,
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    shouldTransferToAgent?: boolean;
  }> {
    const node = await this.botNodeRepository.findOne({
      where: { id: session.currentNodeId },
    });

    if (!node) {
      this.logger.error(`Nodo ${session.currentNodeId} no encontrado`);
      return { shouldRespond: false };
    }

    this.logger.log(`📍 Ejecutando nodo: ${node.name} (${node.type})`);

    switch (node.type) {
      case BotNodeType.MESSAGE:
        return this.handleMessageNode(session, node);

      case BotNodeType.MENU:
        return this.handleMenuNode(session, node, userMessage);

      case BotNodeType.INPUT:
        return this.handleInputNode(session, node, userMessage);

      case BotNodeType.TRANSFER_AGENT:
        return this.handleTransferNode(session);

      case BotNodeType.END:
        this.botSessions.delete(session.chatId);
        return { shouldRespond: false };

      default:
        if (node.nextNodeId) {
          session.currentNodeId = node.nextNodeId;
          return this.executeCurrentNode(session, userMessage);
        }
        return { shouldRespond: false };
    }
  }

  /**
   * Nodo de mensaje simple
   */
  private async handleMessageNode(session: BotSession, node: BotNode) {
    const message = this.replaceVariables(node.config.message || '', session.variables);
    
    // Avanzar al siguiente nodo
    if (node.nextNodeId) {
      session.currentNodeId = node.nextNodeId;
      this.botSessions.set(session.chatId, session);
      return {
        shouldRespond: true,
        response: message,
      };
    }

    return {
      shouldRespond: true,
      response: message,
    };
  }

  /**
   * Nodo de menú - presenta opciones
   */
  private async handleMenuNode(session: BotSession, node: BotNode, userMessage: string) {
    // Si no está esperando respuesta, enviar el menú
    if (!session.waitingForInput) {
      session.waitingForInput = true;
      this.botSessions.set(session.chatId, session);
      
      let menuText = node.config.message || 'Selecciona una opción:';
      if (node.config.options) {
        menuText += '\n\n';
        node.config.options.forEach((opt, idx) => {
          menuText += `${idx + 1}. ${opt.label}\n`;
        });
      }
      
      return {
        shouldRespond: true,
        response: menuText,
      };
    }

    // Usuario respondió, procesar la selección
    session.waitingForInput = false;
    
    if (node.config.options) {
      // Buscar la opción seleccionada
      const selectedOption = node.config.options.find((opt, idx) => 
        userMessage === String(idx + 1) || 
        userMessage.toLowerCase() === opt.value.toLowerCase() ||
        userMessage.toLowerCase() === opt.label.toLowerCase()
      );
      
      if (selectedOption && selectedOption.nextNodeId) {
        session.currentNodeId = selectedOption.nextNodeId;
      } else if (node.nextNodeId) {
        session.currentNodeId = node.nextNodeId;
      }
    }

    this.botSessions.set(session.chatId, session);
    return this.executeCurrentNode(session, userMessage);
  }

  /**
   * Nodo de input - captura información
   */
  private async handleInputNode(session: BotSession, node: BotNode, userMessage: string) {
    // Si no está esperando respuesta, enviar la pregunta
    if (!session.waitingForInput) {
      session.waitingForInput = true;
      this.botSessions.set(session.chatId, session);
      
      return {
        shouldRespond: true,
        response: node.config.message || 'Por favor ingresa tu respuesta:',
      };
    }

    // Usuario respondió, guardar la respuesta
    session.waitingForInput = false;
    const variableName = node.config.variableName || 'input';
    session.variables[variableName] = userMessage;

    // Avanzar al siguiente nodo
    if (node.nextNodeId) {
      session.currentNodeId = node.nextNodeId;
    }

    this.botSessions.set(session.chatId, session);
    return this.executeCurrentNode(session, userMessage);
  }

  /**
   * Nodo de transferencia a agente
   */
  private async handleTransferNode(session: BotSession) {
    this.logger.log(`👤 Colocando chat ${session.chatId} en cola de espera para asignación`);
    
    // Actualizar el chat a estado BOT_WAITING_QUEUE
    await this.chatRepository.update(session.chatId, {
      status: () => "'bot'",
      subStatus: 'bot_waiting_queue',
    });

    // Eliminar la sesión del bot
    this.botSessions.delete(session.chatId);

    this.logger.log(`✅ Chat ${session.chatId} ahora está en cola de espera para asignación manual`);

    return {
      shouldRespond: true,
      response: 'Te estoy conectando con un asesor. En un momento te atenderá.',
      shouldTransferToAgent: true,
    };
  }

  /**
   * Reemplazar variables en texto
   */
  private replaceVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * Reiniciar bot para un chat
   */
  async resetBotSession(chatId: string): Promise<void> {
    this.botSessions.delete(chatId);
    this.logger.log(`🔄 Sesión de bot reiniciada para chat ${chatId}`);
  }

  /**
   * Obtener sesión activa de un chat
   */
  getBotSession(chatId: string): BotSession | undefined {
    return this.botSessions.get(chatId);
  }

  /**
   * Enviar mensaje del bot (guardar en BD y enviar por WhatsApp)
   */
  private async sendBotMessage(chat: Chat, messageText: string): Promise<void> {
    try {
      // 1. Enviar por WhatsApp
      if (chat.whatsappNumber) {
        await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          messageText,
          MessageType.TEXT,
        );
      }

      // 2. Guardar mensaje en la base de datos
      const savedMessage = await this.messagesService.create({
        chatId: chat.id,
        content: messageText,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
      });

      this.logger.log(`✅ Mensaje del bot enviado y guardado: ${savedMessage.id}`);

      // 3. Emitir evento para notificar al frontend
      this.eventEmitter.emit('message.created', {
        message: savedMessage,
        chat: chat,
      });

    } catch (error) {
      this.logger.error(`Error enviando mensaje del bot: ${error.message}`, error.stack);
    }
  }
}
