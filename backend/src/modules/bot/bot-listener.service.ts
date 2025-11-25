import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotEngineService } from './bot-engine.service';
import { ChatsService } from '../chats/chats.service';
import { DebtorsService } from '../debtors/debtors.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { Message, MessageDirection } from '../messages/entities/message.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { DocumentType } from '../debtors/entities/debtor.entity';

interface MessageCreatedEvent {
  message: Message;
  chat: Chat;
}

@Injectable()
export class BotListenerService {
  private readonly logger = new Logger(BotListenerService.name);

  constructor(
    private botEngineService: BotEngineService,
    private chatsService: ChatsService,
    private debtorsService: DebtorsService,
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
      this.logger.log(`🔄 Chat ${chat.id} ya está en modo bot, procesando input del usuario`);
      await this.botEngineService.processUserInput(chat.id, message.content);
      return;
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
      // Intentar buscar deudor por teléfono
      const debtor = await this.debtorsService.findByPhone(chat.contactPhone);
      
      // Inicializar variables del bot
      const botVariables: Record<string, any> = {
        clientName: chat.contactName || 'Cliente',
        clientPhone: chat.contactPhone,
      };

      if (debtor) {
        // Si encontramos al deudor, cargar sus datos
        botVariables.debtorFound = true;
        botVariables.debtorName = debtor.fullName;
        botVariables.documentType = debtor.documentType;
        botVariables.documentNumber = debtor.documentNumber;
        botVariables.debtAmount = debtor.debtAmount;
        botVariables.daysOverdue = debtor.daysOverdue;
        botVariables.status = debtor.status;

        this.logger.log(`💳 Deudor encontrado: ${debtor.fullName} - Deuda: $${debtor.debtAmount}`);
        
        // Actualizar última fecha de contacto
        await this.debtorsService.updateLastContacted(debtor.id);
      } else {
        // No se encontró deudor, el bot preguntará por documento
        botVariables.debtorFound = false;
        this.logger.log(`❓ Deudor no encontrado para teléfono ${chat.contactPhone}`);
      }

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
}
