import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from '../../messages/entities/message.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Servicio de auditoría de mensajes
 * Rastrea el estado de envío de mensajes y detecta problemas
 */
export interface MessageAuditLog {
  messageId: string;
  chatId: string;
  whatsappNumberId: string;
  direction: 'inbound' | 'outbound';
  status: string;
  twilioSid?: string;
  twilioStatus?: string;
  errorCode?: number;
  errorMessage?: string;
  timestamp: Date;
  latencyMs?: number;
}

@Injectable()
export class MessageAuditService {
  private readonly logger = new Logger(MessageAuditService.name);

  // Cache de mensajes pendientes de confirmación
  private pendingMessages: Map<string, {
    messageId: string;
    sentAt: Date;
    timeout: NodeJS.Timeout;
  }> = new Map();

  // Timeout para considerar un mensaje como "sin confirmación"
  private readonly DELIVERY_TIMEOUT_MS = 30000; // 30 segundos

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Registrar intento de envío de mensaje
   */
  async recordSendAttempt(
    messageId: string,
    chatId: string,
    whatsappNumberId: string,
  ): Promise<void> {
    const sentAt = new Date();

    // Configurar timeout para verificar entrega
    const timeout = setTimeout(() => {
      this.handleDeliveryTimeout(messageId);
    }, this.DELIVERY_TIMEOUT_MS);

    this.pendingMessages.set(messageId, {
      messageId,
      sentAt,
      timeout,
    });

    this.logger.log(`📤 Mensaje ${messageId} enviado, esperando confirmación...`);
  }

  /**
   * Registrar confirmación de envío exitoso
   */
  async recordSendSuccess(
    messageId: string,
    twilioSid?: string,
    twilioStatus?: string,
  ): Promise<void> {
    const pending = this.pendingMessages.get(messageId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
      
      const latencyMs = Date.now() - pending.sentAt.getTime();
      
      await this.messageRepository.update(messageId, {
        status: MessageStatus.SENT,
        externalId: twilioSid,
        sentAt: new Date(),
      });

      this.logger.log(
        `✅ Mensaje ${messageId} confirmado (SID: ${twilioSid}, Latencia: ${latencyMs}ms)`
      );

      this.eventEmitter.emit('message.delivery.success', {
        messageId,
        twilioSid,
        latencyMs,
      });
    } else {
      // Mensaje no estaba en pendientes (posible confirmación tardía)
      this.logger.warn(`⚠️ Confirmación para mensaje ${messageId} no encontrado en pendientes`);
    }
  }

  /**
   * Registrar fallo de envío
   */
  async recordSendFailure(
    messageId: string,
    errorCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    const pending = this.pendingMessages.get(messageId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
    }

    await this.messageRepository.update(messageId, {
      status: MessageStatus.FAILED,
      errorMessage: JSON.stringify({ errorCode, errorMessage }),
    });

    this.logger.error(
      `❌ Mensaje ${messageId} falló (Código: ${errorCode}, Error: ${errorMessage})`
    );

    this.eventEmitter.emit('message.delivery.failed', {
      messageId,
      errorCode,
      errorMessage,
    });
  }

  /**
   * Manejar timeout de entrega
   */
  private async handleDeliveryTimeout(messageId: string): Promise<void> {
    this.pendingMessages.delete(messageId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (message && message.status === MessageStatus.PENDING) {
      // Marcar como estado desconocido
      await this.messageRepository.update(messageId, {
        status: MessageStatus.FAILED,
        errorMessage: JSON.stringify({ 
          error: 'DELIVERY_TIMEOUT',
          message: 'No se recibió confirmación de entrega en 30 segundos'
        }),
      });

      this.logger.warn(`⏰ Timeout de entrega para mensaje ${messageId}`);

      this.eventEmitter.emit('message.delivery.timeout', {
        messageId,
        chatId: message.chatId,
      });
    }
  }

  /**
   * Actualizar estado desde webhook de Twilio
   */
  async updateFromTwilioWebhook(
    twilioSid: string,
    status: string,
    errorCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { externalId: twilioSid },
    });

    if (!message) {
      this.logger.warn(`Webhook para SID ${twilioSid} no encontró mensaje`);
      return;
    }

    // Mapear estados de Twilio a estados internos
    const statusMap: Record<string, MessageStatus> = {
      'queued': MessageStatus.PENDING,
      'sending': MessageStatus.PENDING,
      'sent': MessageStatus.SENT,
      'delivered': MessageStatus.DELIVERED,
      'read': MessageStatus.READ,
      'failed': MessageStatus.FAILED,
      'undelivered': MessageStatus.FAILED,
    };

    const newStatus = statusMap[status] || message.status;

    await this.messageRepository.update(message.id, {
      status: newStatus,
      deliveredAt: status === 'delivered' ? new Date() : message.deliveredAt,
      readAt: status === 'read' ? new Date() : message.readAt,
      errorMessage: errorCode 
        ? JSON.stringify({ errorCode, errorMessage: errorMessage, twilioStatus: status })
        : message.errorMessage,
    });

    this.logger.log(
      `📬 Webhook Twilio: Mensaje ${message.id} -> ${status} (${newStatus})`
    );

    // Emitir evento si es un estado final
    if (status === 'delivered') {
      this.eventEmitter.emit('message.delivered', { messageId: message.id });
    } else if (status === 'read') {
      this.eventEmitter.emit('message.read', { messageId: message.id });
    } else if (status === 'failed' || status === 'undelivered') {
      this.eventEmitter.emit('message.delivery.failed', {
        messageId: message.id,
        errorCode,
        errorMessage,
      });
    }
  }

  /**
   * Obtener estadísticas de entrega
   */
  async getDeliveryStats(
    whatsappNumberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    deliveryRate: number;
    readRate: number;
  }> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
      .andWhere('message.direction = :direction', { direction: 'outbound' })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const total = messages.length;
    const sent = messages.filter(m => m.status === MessageStatus.SENT).length;
    const delivered = messages.filter(m => m.status === MessageStatus.DELIVERED).length;
    const read = messages.filter(m => m.status === MessageStatus.READ).length;
    const failed = messages.filter(m => m.status === MessageStatus.FAILED).length;
    const pending = messages.filter(m => m.status === MessageStatus.PENDING).length;

    const successfulDeliveries = delivered + read;
    const deliveryRate = total > 0 ? (successfulDeliveries / total) * 100 : 0;
    const readRate = successfulDeliveries > 0 ? (read / successfulDeliveries) * 100 : 0;

    return {
      total,
      sent,
      delivered,
      read,
      failed,
      pending,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
    };
  }

  /**
   * Obtener mensajes con problemas de entrega
   */
  async getFailedMessages(
    whatsappNumberId?: string,
    limit: number = 50,
  ): Promise<Message[]> {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.status = :status', { status: MessageStatus.FAILED })
      .andWhere('message.direction = :direction', { direction: 'outbound' })
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (whatsappNumberId) {
      query.andWhere('message.whatsappNumberId = :whatsappNumberId', {
        whatsappNumberId,
      });
    }

    return query.getMany();
  }
}
