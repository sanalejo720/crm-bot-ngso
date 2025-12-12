import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Message, MessageDirection, MessageStatus } from '../../messages/entities/message.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Servicio para detectar riesgo de bloqueo/spam en Twilio
 * 
 * LÍMITES RECOMENDADOS POR TWILIO:
 * - Para números nuevos: máximo 30-50 mensajes/día inicialmente
 * - Para números establecidos: hasta 1000 mensajes/día
 * - Rate limiting: no más de 1 mensaje/segundo por número
 * - Ratio respuesta/envío saludable: > 20%
 */
@Injectable()
export class TwilioSpamDetectorService {
  private readonly logger = new Logger(TwilioSpamDetectorService.name);

  // Umbrales de alerta (configurables)
  private readonly THRESHOLDS = {
    MAX_MESSAGES_PER_HOUR: 100,
    MAX_MESSAGES_PER_DAY: 800,
    MAX_TO_SAME_CONTACT_PER_HOUR: 10,
    MIN_RESPONSE_RATIO: 0.15,
    MAX_CONSECUTIVE_ERRORS: 5,
  };

  // Códigos de error de Twilio relacionados con spam/bloqueo
  private readonly TWILIO_SPAM_ERROR_CODES = [
    21610, 21614, 21408, 30003, 30004, 30005, 30006, 30007, 30008, 63016, 63032,
  ];

  // Contador de errores consecutivos por número
  private errorCounters: Map<string, number> = new Map();

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Verificar si es seguro enviar un mensaje (pre-envío)
   */
  async canSendMessage(
    whatsappNumberId: string,
    toPhone: string,
  ): Promise<{ allowed: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Verificar mensajes por hora del número usando QueryBuilder con join
    const messagesLastHour = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('message.createdAt > :oneHourAgo', { oneHourAgo })
      .getCount();

    if (messagesLastHour >= this.THRESHOLDS.MAX_MESSAGES_PER_HOUR) {
      this.emitAlert('high', 'RATE_LIMIT_HOUR', whatsappNumberId, {
        count: messagesLastHour,
        threshold: this.THRESHOLDS.MAX_MESSAGES_PER_HOUR,
      });
      return {
        allowed: false,
        reason: `Límite de mensajes por hora excedido (${messagesLastHour}/${this.THRESHOLDS.MAX_MESSAGES_PER_HOUR})`,
        riskLevel: 'high',
      };
    }

    // 2. Verificar mensajes por día del número
    const messagesLastDay = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
      .getCount();

    if (messagesLastDay >= this.THRESHOLDS.MAX_MESSAGES_PER_DAY) {
      this.emitAlert('high', 'RATE_LIMIT_DAY', whatsappNumberId, {
        count: messagesLastDay,
        threshold: this.THRESHOLDS.MAX_MESSAGES_PER_DAY,
      });
      return {
        allowed: false,
        reason: `Límite de mensajes por día excedido (${messagesLastDay}/${this.THRESHOLDS.MAX_MESSAGES_PER_DAY})`,
        riskLevel: 'high',
      };
    }

    // 3. Verificar errores consecutivos
    const errorCount = this.errorCounters.get(whatsappNumberId) || 0;
    if (errorCount >= this.THRESHOLDS.MAX_CONSECUTIVE_ERRORS) {
      this.emitAlert('high', 'CONSECUTIVE_ERRORS', whatsappNumberId, { errorCount });
      return {
        allowed: false,
        reason: `Demasiados errores consecutivos (${errorCount}). Posible bloqueo.`,
        riskLevel: 'high',
      };
    }

    // 4. Verificar ratio de respuesta
    const outboundCount = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
      .getCount();

    const inboundCount = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.INBOUND })
      .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
      .getCount();

    if (outboundCount > 100) {
      const responseRatio = inboundCount / outboundCount;
      if (responseRatio < this.THRESHOLDS.MIN_RESPONSE_RATIO) {
        this.emitAlert('medium', 'LOW_RESPONSE_RATIO', whatsappNumberId, {
          inbound: inboundCount,
          outbound: outboundCount,
          ratio: (responseRatio * 100).toFixed(2) + '%',
        });
        return {
          allowed: true,
          reason: `Ratio de respuesta bajo (${(responseRatio * 100).toFixed(2)}%). Riesgo de spam.`,
          riskLevel: 'medium',
        };
      }
    }

    // Calcular nivel de riesgo
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (messagesLastDay > this.THRESHOLDS.MAX_MESSAGES_PER_DAY * 0.7) riskLevel = 'medium';
    if (messagesLastHour > this.THRESHOLDS.MAX_MESSAGES_PER_HOUR * 0.8) riskLevel = 'medium';

    return { allowed: true, riskLevel };
  }

  /**
   * Registrar resultado de envío
   */
  async recordSendResult(
    whatsappNumberId: string,
    success: boolean,
    errorCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    if (success) {
      this.errorCounters.set(whatsappNumberId, 0);
    } else {
      const currentCount = this.errorCounters.get(whatsappNumberId) || 0;
      this.errorCounters.set(whatsappNumberId, currentCount + 1);

      if (errorCode && this.TWILIO_SPAM_ERROR_CODES.includes(errorCode)) {
        this.emitAlert('high', 'SPAM_ERROR_CODE', whatsappNumberId, {
          errorCode,
          errorMessage,
          consecutiveErrors: currentCount + 1,
        });
      }
    }
  }

  /**
   * Obtener estadísticas de envío por número
   */
  async getNumberStats(whatsappNumberId: string): Promise<{
    lastHour: { sent: number; received: number; errors: number };
    lastDay: { sent: number; received: number; errors: number };
    responseRatio: number;
    riskLevel: 'low' | 'medium' | 'high';
    consecutiveErrors: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [sentHour, receivedHour, errorsHour] = await Promise.all([
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
        .andWhere('message.status = :status', { status: MessageStatus.SENT })
        .andWhere('message.createdAt > :oneHourAgo', { oneHourAgo })
        .getCount(),
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.INBOUND })
        .andWhere('message.createdAt > :oneHourAgo', { oneHourAgo })
        .getCount(),
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
        .andWhere('message.status = :status', { status: MessageStatus.FAILED })
        .andWhere('message.createdAt > :oneHourAgo', { oneHourAgo })
        .getCount(),
    ]);

    const [sentDay, receivedDay, errorsDay] = await Promise.all([
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
        .andWhere('message.status = :status', { status: MessageStatus.SENT })
        .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
        .getCount(),
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.INBOUND })
        .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
        .getCount(),
      this.messageRepository.createQueryBuilder('message')
        .innerJoin('message.chat', 'chat')
        .where('chat.whatsappNumberId = :whatsappNumberId', { whatsappNumberId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
        .andWhere('message.status = :status', { status: MessageStatus.FAILED })
        .andWhere('message.createdAt > :oneDayAgo', { oneDayAgo })
        .getCount(),
    ]);

    const responseRatio = sentDay > 0 ? receivedDay / sentDay : 1;
    const consecutiveErrors = this.errorCounters.get(whatsappNumberId) || 0;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (sentDay > this.THRESHOLDS.MAX_MESSAGES_PER_DAY * 0.7 || 
        responseRatio < this.THRESHOLDS.MIN_RESPONSE_RATIO ||
        consecutiveErrors > 2) {
      riskLevel = 'medium';
    }
    if (sentDay > this.THRESHOLDS.MAX_MESSAGES_PER_DAY * 0.9 ||
        consecutiveErrors >= this.THRESHOLDS.MAX_CONSECUTIVE_ERRORS) {
      riskLevel = 'high';
    }

    return {
      lastHour: { sent: sentHour, received: receivedHour, errors: errorsHour },
      lastDay: { sent: sentDay, received: receivedDay, errors: errorsDay },
      responseRatio,
      riskLevel,
      consecutiveErrors,
    };
  }

  /**
   * Cron job para verificar salud de los números (cada 30 minutos)
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkNumbersHealth(): Promise<void> {
    this.logger.log('🔍 Verificando salud de números Twilio...');

    const activeChats = await this.chatRepository
      .createQueryBuilder('chat')
      .select('DISTINCT chat.whatsappNumberId', 'whatsappNumberId')
      .where('chat.createdAt > :date', { 
        date: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      })
      .andWhere('chat.whatsappNumberId IS NOT NULL')
      .getRawMany();

    for (const { whatsappNumberId } of activeChats) {
      if (!whatsappNumberId) continue;
      
      const stats = await this.getNumberStats(whatsappNumberId);
      
      if (stats.riskLevel === 'high') {
        this.emitAlert('high', 'NUMBER_HIGH_RISK', whatsappNumberId, stats);
      } else if (stats.riskLevel === 'medium') {
        this.emitAlert('medium', 'NUMBER_MEDIUM_RISK', whatsappNumberId, stats);
      }

      this.logger.log(
        `📊 Número ${whatsappNumberId}: ` +
        `Enviados(día): ${stats.lastDay.sent}, ` +
        `Ratio: ${(stats.responseRatio * 100).toFixed(1)}%, ` +
        `Riesgo: ${stats.riskLevel}`
      );
    }
  }

  /**
   * Emitir alerta interna
   */
  private emitAlert(
    severity: 'low' | 'medium' | 'high',
    type: string,
    whatsappNumberId: string,
    data: any,
  ): void {
    const alert = {
      severity,
      type,
      whatsappNumberId,
      data,
      timestamp: new Date(),
    };

    this.logger.warn(`⚠️ ALERTA TWILIO [${severity.toUpperCase()}] - ${type}: ${JSON.stringify(data)}`);
    this.eventEmitter.emit('twilio.spam.alert', alert);
  }
}
