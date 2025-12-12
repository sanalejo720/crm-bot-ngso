import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Chat } from '../chats/entities/chat.entity';
import { ChatStateService } from '../chats/services/chat-state.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Worker que monitorea timeouts de chats
 * 
 * REGLAS DE TIMEOUT (Según requisitos):
 * - Alerta al agente a los 30 minutos sin respuesta
 * - Cierre automático a las 24 horas si el agente no responde
 * - NO se cierra el chat por inactividad del cliente (solo se notifica)
 */
@Injectable()
export class TimeoutMonitorWorker {
  private readonly logger = new Logger(TimeoutMonitorWorker.name);

  // Tiempos en minutos
  private readonly AGENT_WARNING_TIME = 30; // Alerta a los 30 min
  private readonly AGENT_TIMEOUT_TIME = 60 * 24; // Cierre a las 24 horas (1440 min)
  
  // Para clientes: solo warning, NO cierre automático
  private readonly CLIENT_WARNING_TIME = 60; // Warning a la hora (informativo)
  private readonly CLIENT_TIMEOUT_TIME = 60 * 24; // 24h (legacy, no se usa)
  private readonly CLIENT_TIMEOUT_ENABLED = false; // DESHABILITADO: no cerrar por cliente

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private chatStateService: ChatStateService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cron que se ejecuta cada minuto para verificar timeouts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts() {
    this.logger.log('⏰ Iniciando verificación de timeouts...');

    try {
      await Promise.all([
        this.checkAgentTimeouts(),
        this.checkClientTimeouts(),
      ]);
    } catch (error) {
      this.logger.error(`Error en verificación de timeouts: ${error.message}`, error.stack);
    }
  }

  /**
   * Verificar timeouts de agentes (sin respuesta del agente)
   */
  private async checkAgentTimeouts() {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() - this.AGENT_WARNING_TIME * 60000);
    const timeoutThreshold = new Date(now.getTime() - this.AGENT_TIMEOUT_TIME * 60000);

    // 1. Chats que necesitan warning (5 min sin respuesta del agente)
    const chatsNeedingWarning = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.status = :status', { status: 'active' })
      .andWhere('chat.lastClientMessageAt IS NOT NULL')
      .andWhere('chat.lastClientMessageAt < :warningThreshold', { warningThreshold })
      .andWhere('(chat.lastAgentMessageAt IS NULL OR chat.lastAgentMessageAt < chat.lastClientMessageAt)')
      .andWhere('chat.agentWarningSent = :sent', { sent: false })
      .andWhere('chat.assignedAgentId IS NOT NULL')
      .getMany();

    for (const chat of chatsNeedingWarning) {
      await this.sendAgentWarning(chat);
    }

    this.logger.log(`⚠️ Warnings enviados: ${chatsNeedingWarning.length} chats`);

    // 2. Chats que deben cerrarse por timeout (6 min sin respuesta del agente)
    const chatsToTimeout = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.status = :status', { status: 'active' })
      .andWhere('chat.lastClientMessageAt IS NOT NULL')
      .andWhere('chat.lastClientMessageAt < :timeoutThreshold', { timeoutThreshold })
      .andWhere('(chat.lastAgentMessageAt IS NULL OR chat.lastAgentMessageAt < chat.lastClientMessageAt)')
      .andWhere('chat.agentWarningSent = :sent', { sent: true })
      .andWhere('chat.assignedAgentId IS NOT NULL')
      .getMany();

    for (const chat of chatsToTimeout) {
      await this.closeByAgentTimeout(chat);
    }

    this.logger.log(`⏰ Chats cerrados por timeout de agente: ${chatsToTimeout.length}`);
  }

  /**
   * Verificar timeouts de clientes (sin respuesta del cliente)
   * NOTA: Solo enviamos warning informativo, NO cerramos el chat
   */
  private async checkClientTimeouts() {
    // Si el timeout de cliente está deshabilitado, no cerramos
    if (!this.CLIENT_TIMEOUT_ENABLED) {
      // Solo enviar warnings informativos
      const now = new Date();
      const warningThreshold = new Date(now.getTime() - this.CLIENT_WARNING_TIME * 60000);

      // Chats que necesitan warning informativo
      const chatsNeedingWarning = await this.chatRepository
        .createQueryBuilder('chat')
        .where('chat.status = :status', { status: 'active' })
        .andWhere('chat.lastAgentMessageAt IS NOT NULL')
        .andWhere('chat.lastAgentMessageAt < :warningThreshold', { warningThreshold })
        .andWhere('(chat.lastClientMessageAt IS NULL OR chat.lastClientMessageAt < chat.lastAgentMessageAt)')
        .andWhere('chat.clientWarningSent = :sent', { sent: false })
        .andWhere('chat.assignedAgentId IS NOT NULL')
        .getMany();

      for (const chat of chatsNeedingWarning) {
        await this.sendClientWarning(chat);
      }

      this.logger.log(`ℹ️ Warnings informativos de cliente enviados: ${chatsNeedingWarning.length} chats (sin cierre automático)`);
      return;
    }

    // El cierre por timeout de cliente está DESHABILITADO según requisitos
    // Si se necesitara habilitar en el futuro, descomentar y ajustar
    this.logger.log(`ℹ️ Timeout de cliente deshabilitado según configuración`);
  }

  /**
   * Enviar warning al agente (notificación de que debe responder)
   */
  private async sendAgentWarning(chat: Chat) {
    try {
      // Marcar warning como enviado
      await this.chatRepository.update(chat.id, {
        agentWarningSent: true,
      });

      // Emitir evento para notificación WebSocket
      this.eventEmitter.emit('chat.agent.timeout.warning', {
        chatId: chat.id,
        agentId: chat.assignedAgentId,
        minutesSinceLastMessage: this.AGENT_WARNING_TIME,
      });

      this.logger.log(`⚠️ Warning enviado al agente para chat ${chat.id}`);
    } catch (error) {
      this.logger.error(`Error enviando warning de agente: ${error.message}`);
    }
  }

  /**
   * Enviar warning al cliente (notificación de que el chat cerrará pronto)
   */
  private async sendClientWarning(chat: Chat) {
    try {
      // Marcar warning como enviado
      await this.chatRepository.update(chat.id, {
        clientWarningSent: true,
      });

      // Emitir evento para notificación WebSocket al agente
      this.eventEmitter.emit('chat.client.timeout.warning', {
        chatId: chat.id,
        agentId: chat.assignedAgentId,
        minutesSinceLastMessage: this.CLIENT_WARNING_TIME,
      });

      this.logger.log(`⚠️ Warning de cliente enviado para chat ${chat.id}`);
    } catch (error) {
      this.logger.error(`Error enviando warning de cliente: ${error.message}`);
    }
  }

  /**
   * Cerrar chat por timeout del agente
   */
  private async closeByAgentTimeout(chat: Chat) {
    try {
      await this.chatStateService.transition(
        chat.id,
        'closed' as any,
        'closed_agent_timeout',
        {
          reason: `Chat cerrado automáticamente: agente no respondió en ${this.AGENT_TIMEOUT_TIME} minutos`,
          triggeredBy: 'system',
          agentId: chat.assignedAgentId,
        },
      );

      // Emitir evento de cierre
      this.eventEmitter.emit('chat.closed.agent.timeout', {
        chatId: chat.id,
        agentId: chat.assignedAgentId,
      });

      this.logger.log(`🚫 Chat ${chat.id} cerrado por timeout de agente`);
    } catch (error) {
      this.logger.error(`Error cerrando chat por timeout de agente: ${error.message}`);
    }
  }

  /**
   * Cerrar chat por timeout del cliente
   */
  private async closeByClientTimeout(chat: Chat) {
    try {
      await this.chatStateService.transition(
        chat.id,
        'closed' as any,
        'closed_client_inactive',
        {
          reason: `Chat cerrado automáticamente: cliente no respondió en ${this.CLIENT_TIMEOUT_TIME} minutos`,
          triggeredBy: 'system',
          agentId: chat.assignedAgentId,
        },
      );

      // Emitir evento de cierre
      this.eventEmitter.emit('chat.closed.client.timeout', {
        chatId: chat.id,
        agentId: chat.assignedAgentId,
      });

      this.logger.log(`🚫 Chat ${chat.id} cerrado por inactividad del cliente`);
    } catch (error) {
      this.logger.error(`Error cerrando chat por timeout de cliente: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de timeouts
   */
  async getTimeoutStats(startDate: Date, endDate: Date) {
    const agentTimeouts = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.subStatus = :status', { status: 'closed_agent_timeout' })
      .andWhere('chat.closedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const clientTimeouts = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.subStatus = :status', { status: 'closed_client_inactive' })
      .andWhere('chat.closedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    return {
      agentTimeouts,
      clientTimeouts,
      total: agentTimeouts + clientTimeouts,
    };
  }
}
