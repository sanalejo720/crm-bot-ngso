import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Chat, ChatStatus } from '../entities/chat.entity';
import { ResolveChatDto, ResolutionType } from '../dto/resolve-chat.dto';
import { Client } from '../../clients/entities/client.entity';
import { PaymentRecord, PaymentSource, PaymentStatus } from '../../metrics/entities/payment-record.entity';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { ChatsExportService } from '../chats-export.service';
import { MessageType } from '../../messages/entities/message.entity';
import { MessagesService } from '../../messages/messages.service';

@Injectable()
export class ChatResolutionService {
  private readonly logger = new Logger(ChatResolutionService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(PaymentRecord)
    private paymentRecordRepository: Repository<PaymentRecord>,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    @Inject(forwardRef(() => ChatsExportService))
    private chatsExportService: ChatsExportService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) {}

  /**
   * Resolver un chat con diferentes tipos de resultado
   */
  async resolveChat(chatId: string, resolveDto: ResolveChatDto, agentId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['client', 'campaign', 'whatsappNumber', 'assignedAgent'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`);
    }

    this.logger.log(`Resolviendo chat ${chatId} con tipo: ${resolveDto.resolutionType}`);

    // Procesar según el tipo de resolución
    switch (resolveDto.resolutionType) {
      case ResolutionType.PAID:
        await this.handlePaymentResolution(chat, resolveDto, agentId);
        break;
      case ResolutionType.PROMISE:
        await this.handlePromiseResolution(chat, resolveDto, agentId);
        break;
      case ResolutionType.NO_AGREEMENT:
        await this.handleNoAgreementResolution(chat, resolveDto, agentId);
        break;
      case ResolutionType.CALLBACK:
        await this.handleCallbackResolution(chat, resolveDto, agentId);
        break;
    }

    // Actualizar estado del chat
    chat.status = ChatStatus.RESOLVED;
    chat.resolvedAt = new Date();
    chat.resolutionType = resolveDto.resolutionType;
    chat.resolutionNotes = resolveDto.notes || '';
    
    // Guardar metadata de resolución
    chat.resolutionMetadata = {
      type: resolveDto.resolutionType,
      paymentMethod: resolveDto.paymentMethod,
      paymentAmount: resolveDto.paymentAmount,
      promiseDate: resolveDto.promiseDate,
      promiseAmount: resolveDto.promiseAmount,
      promisePaymentMethod: resolveDto.promisePaymentMethod,
      noAgreementReason: resolveDto.noAgreementReason,
      callbackDate: resolveDto.callbackDate,
      callbackNotes: resolveDto.callbackNotes,
      resolvedBy: agentId,
      resolvedAt: new Date().toISOString(),
    };

    await this.chatRepository.save(chat);

    // Enviar mensaje de cierre al cliente PRIMERO (antes del PDF)
    if (resolveDto.sendClosingMessage) {
      await this.sendClosingMessage(chat, resolveDto);
    }

    // Generar PDF de cierre para el supervisor (sin enviar mensaje, ya se envió arriba)
    try {
      // Solo generar PDF para PAID y PROMISE, no para NO_AGREEMENT ni CALLBACK
      if (resolveDto.resolutionType === ResolutionType.PAID || resolveDto.resolutionType === ResolutionType.PROMISE) {
        const closureType = resolveDto.resolutionType === ResolutionType.PAID ? 'paid' : 'promise';
        // Pasamos skipMessage=true para evitar enviar mensaje duplicado
        await this.chatsExportService.exportChatToPDF(chatId, closureType, agentId, false, true);
      }
    } catch (error) {
      this.logger.error(`Error generando PDF de cierre: ${error.message}`);
      // El mensaje ya se envió arriba, no hacemos nada más
    }

    // Emitir evento de resolución
    this.eventEmitter.emit('chat.resolved', {
      chat,
      resolutionType: resolveDto.resolutionType,
      agentId,
    });

    return chat;
  }

  /**
   * Manejar resolución por pago realizado
   */
  private async handlePaymentResolution(
    chat: Chat,
    resolveDto: ResolveChatDto,
    agentId: string,
  ): Promise<void> {
    if (!chat.client) {
      this.logger.warn(`Chat ${chat.id} no tiene cliente asociado para registrar pago`);
      return;
    }

    // Actualizar estado del cliente
    const client = chat.client;
    client.collectionStatus = 'paid';
    client.paymentMethod = resolveDto.paymentMethod;
    client.paymentDate = new Date();
    await this.clientRepository.save(client);

    // Registrar el pago en métricas
    const paymentRecord = this.paymentRecordRepository.create({
      clientId: client.id,
      agentId,
      campaignId: chat.campaignId,
      amount: resolveDto.paymentAmount || client.debtAmount || 0,
      originalDebt: client.debtAmount || 0,
      remainingDebt: Math.max(0, (client.debtAmount || 0) - (resolveDto.paymentAmount || 0)),
      recoveryPercentage: client.debtAmount 
        ? ((resolveDto.paymentAmount || client.debtAmount) / client.debtAmount) * 100 
        : 100,
      paymentDate: new Date(),
      source: PaymentSource.MANUAL,
      status: PaymentStatus.CONFIRMED,
      notes: `Pago registrado por agente. Método: ${resolveDto.paymentMethod}`,
      metadata: {
        chatId: chat.id,
        resolutionType: 'paid',
        paymentMethod: resolveDto.paymentMethod,
      },
    });

    await this.paymentRecordRepository.save(paymentRecord);
    this.logger.log(`Pago registrado para cliente ${client.id}: $${paymentRecord.amount}`);
  }

  /**
   * Manejar resolución por promesa de pago
   */
  private async handlePromiseResolution(
    chat: Chat,
    resolveDto: ResolveChatDto,
    agentId: string,
  ): Promise<void> {
    if (!chat.client) {
      this.logger.warn(`Chat ${chat.id} no tiene cliente asociado para registrar promesa`);
      return;
    }

    // Actualizar cliente con promesa de pago
    const client = chat.client;
    client.collectionStatus = 'promise';
    client.promiseDate = resolveDto.promiseDate ? new Date(resolveDto.promiseDate) : null;
    client.promisePaymentAmount = resolveDto.promiseAmount;
    client.paymentMethod = resolveDto.promisePaymentMethod;
    await this.clientRepository.save(client);

    // Registrar promesa en métricas (pendiente de confirmación)
    const paymentRecord = this.paymentRecordRepository.create({
      clientId: client.id,
      agentId,
      campaignId: chat.campaignId,
      amount: resolveDto.promiseAmount || client.debtAmount || 0,
      originalDebt: client.debtAmount || 0,
      remainingDebt: client.debtAmount || 0,
      recoveryPercentage: 0, // Aún no se recupera nada
      paymentDate: resolveDto.promiseDate ? new Date(resolveDto.promiseDate) : new Date(),
      source: PaymentSource.BOT_PROMISE,
      status: PaymentStatus.PENDING,
      notes: `Promesa de pago para ${resolveDto.promiseDate}. Método: ${resolveDto.promisePaymentMethod}`,
      metadata: {
        chatId: chat.id,
        resolutionType: 'promise',
        promiseDate: resolveDto.promiseDate,
        promiseAmount: resolveDto.promiseAmount,
        promisePaymentMethod: resolveDto.promisePaymentMethod,
      },
    });

    await this.paymentRecordRepository.save(paymentRecord);
    this.logger.log(`Promesa de pago registrada para cliente ${client.id}: $${paymentRecord.amount} para ${resolveDto.promiseDate}`);
  }

  /**
   * Manejar resolución sin acuerdo
   */
  private async handleNoAgreementResolution(
    chat: Chat,
    resolveDto: ResolveChatDto,
    agentId: string,
  ): Promise<void> {
    if (!chat.client) {
      return;
    }

    // Actualizar cliente
    const client = chat.client;
    client.collectionStatus = 'no_agreement';
    client.lastContactDate = new Date();
    
    // Agregar nota al array de notas
    const newNote = {
      date: new Date().toISOString(),
      type: 'no_agreement',
      text: `Sin acuerdo: ${resolveDto.noAgreementReason}`,
      agentId,
    };
    client.notes = [...(client.notes || []), newNote];
    await this.clientRepository.save(client);

    this.logger.log(`Cliente ${client.id} marcado sin acuerdo: ${resolveDto.noAgreementReason}`);
  }

  /**
   * Manejar resolución por callback
   */
  private async handleCallbackResolution(
    chat: Chat,
    resolveDto: ResolveChatDto,
    agentId: string,
  ): Promise<void> {
    if (!chat.client) {
      return;
    }

    // Actualizar cliente
    const client = chat.client;
    client.collectionStatus = 'callback';
    client.callbackDate = resolveDto.callbackDate ? new Date(resolveDto.callbackDate) : null;
    
    // Agregar nota al array de notas
    const newNote = {
      date: new Date().toISOString(),
      type: 'callback',
      text: `Cliente se comunicará: ${resolveDto.callbackNotes || 'Sin notas'}`,
      callbackDate: resolveDto.callbackDate,
      agentId,
    };
    client.notes = [...(client.notes || []), newNote];
    await this.clientRepository.save(client);

    this.logger.log(`Cliente ${client.id} marcado para callback: ${resolveDto.callbackDate}`);
  }

  /**
   * Enviar mensaje de cierre al cliente (y guardarlo en la BD)
   */
  private async sendClosingMessage(chat: Chat, resolveDto: ResolveChatDto): Promise<void> {
    let message = '';
    const paymentMethodLabel = this.getPaymentMethodLabel(resolveDto.paymentMethod || '');
    
    switch (resolveDto.resolutionType) {
      case ResolutionType.PAID:
        message = `✅ *Gracias por confirmar su pago*\n\nHemos registrado su pago por medio de: *${paymentMethodLabel}*\n\n📎 Por favor, envíenos una foto o imagen del comprobante de pago para completar el registro.\n\n_NGS&O - Gestión de Cobranza_`;
        break;
      case ResolutionType.PROMISE:
        const formattedDate = resolveDto.promiseDate 
          ? new Date(resolveDto.promiseDate).toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'la fecha acordada';
        const promisePaymentMethodLabel = this.getPaymentMethodLabel(resolveDto.promisePaymentMethod || '');
        message = `📅 *Acuerdo de Pago Registrado*\n\nHemos registrado su compromiso de pago:\n• Fecha: ${formattedDate}\n• Monto: $${resolveDto.promiseAmount?.toLocaleString('es-CO') || 'N/A'}\n• Medio de pago: ${promisePaymentMethodLabel}\n\nLe recordaremos el día del pago. ¡Gracias por su compromiso!\n\n_NGS&O - Gestión de Cobranza_`;
        break;
      case ResolutionType.NO_AGREEMENT:
        message = `📝 *Gestión Finalizada*\n\nHemos registrado su respuesta. Si cambia de opinión o necesita más información sobre opciones de pago, puede contactarnos nuevamente.\n\n_NGS&O - Gestión de Cobranza_`;
        break;
      case ResolutionType.CALLBACK:
        message = `📞 *Le esperamos*\n\nHemos tomado nota de que se comunicará con nosotros próximamente. Estaremos atentos a su llamada.\n\n_NGS&O - Gestión de Cobranza_`;
        break;
    }

    if (message && chat.whatsappNumber?.id) {
      try {
        // Usar MessagesService para que el mensaje se guarde en la BD
        // y aparezca en el chat del agente y en el PDF
        await this.messagesService.sendTextMessage(
          chat.id,
          chat.assignedAgentId || 'system', // ID del agente o 'system' si no hay agente
          message,
        );
        this.logger.log(`✅ Mensaje de cierre enviado y guardado para chat ${chat.id}`);
      } catch (error) {
        this.logger.error(`Error enviando mensaje de cierre: ${error.message}`);
        // Intentar con el método antiguo como fallback (sin guardar en BD)
        try {
          await this.whatsappService.sendMessage(
            chat.whatsappNumber.id,
            chat.contactPhone,
            message,
            MessageType.TEXT,
          );
          this.logger.log(`⚠️ Mensaje de cierre enviado (fallback) pero no guardado en BD`);
        } catch (fallbackError) {
          this.logger.error(`Error en fallback de mensaje de cierre: ${fallbackError.message}`);
        }
      }
    }
  }

  /**
   * Cron Job: Enviar recordatorios de promesas de pago
   * Se ejecuta todos los días a las 9:00 AM
   */
  @Cron('0 9 * * *')
  async sendPaymentReminders(): Promise<void> {
    this.logger.log('🔔 Ejecutando job de recordatorios de promesas de pago...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar clientes con promesas de pago para hoy
    const clientsWithPromises = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.collectionStatus = :status', { status: 'promise' })
      .andWhere('client.promiseDate >= :today', { today })
      .andWhere('client.promiseDate < :tomorrow', { tomorrow })
      .leftJoinAndSelect('client.chats', 'chat')
      .leftJoinAndSelect('chat.whatsappNumber', 'whatsappNumber')
      .getMany();

    this.logger.log(`Encontrados ${clientsWithPromises.length} clientes con promesa de pago para hoy`);

    for (const client of clientsWithPromises) {
      const lastChat = client.chats?.[0];
      if (!lastChat?.whatsappNumber?.id) {
        this.logger.warn(`Cliente ${client.id} no tiene chat con número de WhatsApp asociado`);
        continue;
      }

      const message = `🔔 *Recordatorio de Pago*\n\nHola ${client.fullName || 'estimado cliente'},\n\nLe recordamos que hoy vence su compromiso de pago por $${client.promisePaymentAmount?.toLocaleString() || client.debtAmount?.toLocaleString() || 'N/A'}.\n\nMedio de pago acordado: ${client.paymentMethod || 'No especificado'}\n\nSi ya realizó el pago, por favor envíenos el comprobante. Si tiene alguna dificultad, comuníquese con nosotros.\n\n_NGS&O - Gestión de Cobranza_`;

      try {
        await this.whatsappService.sendMessage(
          lastChat.whatsappNumber.id,
          client.phone || lastChat.contactPhone,
          message,
          MessageType.TEXT,
        );
        this.logger.log(`Recordatorio enviado a cliente ${client.id}: ${client.phone}`);
      } catch (error) {
        this.logger.error(`Error enviando recordatorio a ${client.id}: ${error.message}`);
      }
    }
  }

  /**
   * Obtener estadísticas de resolución por agente
   */
  async getResolutionStatsByAgent(agentId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.resolutionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.status = :status', { status: ChatStatus.RESOLVED })
      .groupBy('chat.resolutionType');

    if (startDate) {
      query.andWhere('chat.resolvedAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('chat.resolvedAt <= :endDate', { endDate });
    }

    const results = await query.getRawMany();

    return {
      paid: parseInt(results.find(r => r.type === 'paid')?.count || '0'),
      promise: parseInt(results.find(r => r.type === 'promise')?.count || '0'),
      no_agreement: parseInt(results.find(r => r.type === 'no_agreement')?.count || '0'),
      callback: parseInt(results.find(r => r.type === 'callback')?.count || '0'),
    };
  }

  /**
   * Obtener estadísticas de resolución global
   */
  async getGlobalResolutionStats(startDate?: Date, endDate?: Date, campaignId?: string): Promise<any> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.resolutionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('chat.status = :status', { status: ChatStatus.RESOLVED });

    if (startDate) {
      query.andWhere('chat.resolvedAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('chat.resolvedAt <= :endDate', { endDate });
    }
    if (campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId });
    }

    query.groupBy('chat.resolutionType');

    const results = await query.getRawMany();

    const totalResolved = results.reduce((sum, r) => sum + parseInt(r.count || '0'), 0);

    return {
      total: totalResolved,
      byType: {
        paid: parseInt(results.find(r => r.type === 'paid')?.count || '0'),
        promise: parseInt(results.find(r => r.type === 'promise')?.count || '0'),
        no_agreement: parseInt(results.find(r => r.type === 'no_agreement')?.count || '0'),
        callback: parseInt(results.find(r => r.type === 'callback')?.count || '0'),
      },
      rates: {
        paid: totalResolved > 0 ? (parseInt(results.find(r => r.type === 'paid')?.count || '0') / totalResolved * 100).toFixed(2) : 0,
        promise: totalResolved > 0 ? (parseInt(results.find(r => r.type === 'promise')?.count || '0') / totalResolved * 100).toFixed(2) : 0,
        no_agreement: totalResolved > 0 ? (parseInt(results.find(r => r.type === 'no_agreement')?.count || '0') / totalResolved * 100).toFixed(2) : 0,
        callback: totalResolved > 0 ? (parseInt(results.find(r => r.type === 'callback')?.count || '0') / totalResolved * 100).toFixed(2) : 0,
      },
    };
  }

  /**
   * Obtener etiqueta legible del método de pago
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'transfer': 'Transferencia Bancaria',
      'pse': 'PSE',
      'card': 'Tarjeta Crédito/Débito',
      'cash': 'Efectivo',
      'other': 'Otro',
    };
    return labels[method] || method || 'No especificado';
  }
}
