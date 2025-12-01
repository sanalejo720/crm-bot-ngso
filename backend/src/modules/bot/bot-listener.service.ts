import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotEngineService } from './bot-engine.service';
import { ChatsService } from '../chats/chats.service';
import { DebtorsService } from '../debtors/debtors.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { Message, MessageDirection, MessageType, MessageSenderType, MessageStatus } from '../messages/entities/message.entity';
import { MessagesService } from '../messages/messages.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { DocumentType } from '../debtors/entities/debtor.entity';

interface MessageCreatedEvent {
  message: Message;
  chat: Chat;
}

interface ChatAssignedEvent {
  chat: Chat;
  agentId: string;
  agentName: string;
}

@Injectable()
export class BotListenerService {
  private readonly logger = new Logger(BotListenerService.name);

  constructor(
    private botEngineService: BotEngineService,
    private chatsService: ChatsService,
    private debtorsService: DebtorsService,
    private messagesService: MessagesService,
    private whatsappService: WhatsappService,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) {}

  /**
   * Listener: Cuando se crea un mensaje entrante, evaluar si activar bot
   */
  @OnEvent('message.created')
  async handleMessageCreated(event: MessageCreatedEvent) {
    const { message, chat } = event;

    // Solo procesar mensajes entrantes
    if (message.direction !== MessageDirection.INBOUND) {
      return;
    }

    this.logger.log(`🤖 Evaluando activación de bot para chat ${chat.id}`);

    // Verificar si el chat ya tiene agente asignado
    if (chat.assignedAgentId) {
      this.logger.log(`⏭️ Chat ${chat.id} ya tiene agente asignado, bot no se activa`);
      return;
    }

    // Verificar si el chat ya está en modo bot
    if (chat.status === ChatStatus.BOT) {
      this.logger.log(`🔄 Chat ${chat.id} ya está en modo bot, verificando sesión...`);
      
      // Verificar si hay sesión activa
      const hasSession = this.botEngineService.hasActiveSession(chat.id);
      
      if (hasSession) {
        // Si hay sesión, procesar el input del usuario
        this.logger.log(`✅ Sesión activa encontrada, procesando input`);
        await this.botEngineService.processUserInput(chat.id, message.content);
        return;
      } else {
        // Si no hay sesión, reiniciar el bot desde el inicio
        this.logger.log(`⚠️ No hay sesión activa, reiniciando flujo desde el inicio`);
        // Continuar con el flujo normal de activación del bot
      }
    }

    // Obtener configuración de la campaña
    const campaign = await this.campaignRepository.findOne({
      where: { id: chat.campaignId },
    });

    if (!campaign) {
      this.logger.warn(`❌ Campaña ${chat.campaignId} no encontrada`);
      return;
    }

    // Verificar si el bot está habilitado en la campaña
    const botEnabled = campaign.settings?.botEnabled || false;
    const botFlowId = campaign.settings?.botFlowId;

    if (!botEnabled || !botFlowId) {
      this.logger.log(`⏭️ Bot no habilitado en campaña ${campaign.name}`);
      return;
    }

    // ACTIVAR BOT
    this.logger.log(`🚀 Activando bot para chat ${chat.id} con flujo ${botFlowId}`);
    
    try {
      // Inicializar variables del bot con datos básicos del contacto
      const botVariables: Record<string, any> = {
        clientName: chat.contactName || 'Cliente',
        clientPhone: chat.contactPhone,
        debtorFound: false, // Inicialmente false, se actualizará cuando proporcione documento
      };

      this.logger.log(`📝 Variables iniciales: Cliente ${chat.contactName}, Tel: ${chat.contactPhone}`);

      // Iniciar flujo de bot
      await this.botEngineService.startFlow(chat.id, botFlowId);

      this.logger.log(`✅ Bot activado exitosamente para chat ${chat.id}`);
    } catch (error) {
      this.logger.error(`❌ Error activando bot: ${error.message}`, error.stack);
    }
  }

  /**
   * Buscar deudor por documento cuando el bot lo solicite
   */
  async searchDebtorByDocument(
    documentType: string,
    documentNumber: string,
  ): Promise<any> {
    try {
      // Validar tipo de documento
      const validType = documentType.toUpperCase() as DocumentType;
      if (!Object.values(DocumentType).includes(validType)) {
        return {
          found: false,
          error: 'Tipo de documento inválido. Use: CC, CE, NIT, TI o PASSPORT',
        };
      }

      const debtor = await this.debtorsService.findByDocument(validType, documentNumber);

      if (!debtor) {
        return {
          found: false,
          message: 'No encontramos información asociada a este documento.',
        };
      }

      // Actualizar última fecha de contacto
      await this.debtorsService.updateLastContacted(debtor.id);

      return {
        found: true,
        debtor: {
          fullName: debtor.fullName,
          documentType: debtor.documentType,
          documentNumber: debtor.documentNumber,
          phone: debtor.phone,
          email: debtor.email,
          debtAmount: debtor.debtAmount,
          initialDebtAmount: debtor.initialDebtAmount,
          daysOverdue: debtor.daysOverdue,
          status: debtor.status,
          lastPaymentDate: debtor.lastPaymentDate,
          promiseDate: debtor.promiseDate,
          metadata: debtor.metadata,
        },
      };
    } catch (error) {
      this.logger.error(`Error buscando deudor: ${error.message}`, error.stack);
      return {
        found: false,
        error: 'Error buscando información. Intente nuevamente.',
      };
    }
  }

  /**
   * Listener: Cuando se asigna un chat a un asesor
   */
  @OnEvent('chat.assigned')
  async handleChatAssigned(event: ChatAssignedEvent) {
    const { chat, agentName } = event;

    this.logger.log(`👤 Chat ${chat.id} asignado a asesor: ${agentName}`);

    try {
      const mensaje = `✅ *¡Has sido conectado con un asesor!*\n\n` +
        `👤 Asesor asignado: *${agentName}*\n` +
        `🎫 Número de ticket: *${chat.id.substring(0, 8).toUpperCase()}*\n\n` +
        `Nuestro asesor te atenderá en breve. Por favor, describe tu consulta.`;

      // Enviar mensaje por WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        mensaje,
        MessageType.TEXT,
      );

      // Guardar mensaje en la base de datos
      const savedMessage = await this.messagesService.create({
        chatId: chat.id,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.BOT,
        content: mensaje,
        externalId: result.messageId,
      });

      await this.messagesService.updateStatus(savedMessage.id, MessageStatus.SENT);
      this.logger.log(`✅ Mensaje de asignación enviado a ${chat.contactPhone}`);
    } catch (error) {
      this.logger.error(`Error enviando mensaje de asignación: ${error.message}`);
    }
  }
}
