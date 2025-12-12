import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Chat } from '../chats/entities/chat.entity';
import { ChatStateService } from '../chats/services/chat-state.service';
import { ChatsExportService } from '../chats/chats-export.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Worker que cierra automáticamente chats antiguos
 * - Cierra chats con más de 24 horas sin actividad
 * - Genera PDF antes de cerrar
 * - Procesa en lotes para evitar sobrecarga
 */
@Injectable()
export class AutoCloseWorker {
  private readonly logger = new Logger(AutoCloseWorker.name);

  // Tiempo de inactividad antes de auto-cierre (24 horas)
  private readonly AUTO_CLOSE_HOURS = 24;
  private readonly BATCH_SIZE = 50; // Procesar 50 chats por ejecución

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private chatStateService: ChatStateService,
    private chatsExportService: ChatsExportService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cron que se ejecuta cada minuto para cerrar chats antiguos
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processAutoClose() {
    this.logger.log('🔄 Iniciando verificación de chats antiguos...');

    try {
      const chatsToClose = await this.findChatsToAutoClose();
      
      if (chatsToClose.length === 0) {
        this.logger.log('✅ No hay chats pendientes de auto-cierre');
        return;
      }

      this.logger.log(`📋 Encontrados ${chatsToClose.length} chats para auto-cierre`);

      let successCount = 0;
      let errorCount = 0;

      for (const chat of chatsToClose) {
        try {
          await this.autoCloseChat(chat);
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error cerrando chat ${chat.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ Auto-cierre completado: ${successCount} exitosos, ${errorCount} errores`,
      );
    } catch (error) {
      this.logger.error(
        `Error en proceso de auto-cierre: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Encontrar chats que deben cerrarse automáticamente
   */
  private async findChatsToAutoClose(): Promise<Chat[]> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - this.AUTO_CLOSE_HOURS);

    // Buscar chats activos o en espera con más de 24 horas sin actividad
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.assignedAgent', 'agent')
      .leftJoinAndSelect('chat.whatsappNumber', 'whatsappNumber')
      .where('chat.status IN (:...statuses)', {
        statuses: ['active', 'waiting', 'pending'],
      })
      .andWhere(
        '(chat.lastClientMessageAt < :threshold OR chat.lastAgentMessageAt < :threshold)',
        { threshold },
      )
      .orderBy('chat.lastClientMessageAt', 'ASC')
      .take(this.BATCH_SIZE)
      .getMany();

    return chats;
  }

  /**
   * Cerrar chat automáticamente
   */
  private async autoCloseChat(chat: Chat) {
    this.logger.log(`🔒 Cerrando chat ${chat.id} por inactividad...`);

    try {
      // 1. Generar PDF del chat
      if (chat.assignedAgentId) {
        try {
          await this.chatsExportService.exportChatToPDF(
            chat.id,
            'promise',
            chat.assignedAgentId,
          );
          this.logger.log(`📄 PDF generado para chat ${chat.id}`);
        } catch (pdfError) {
          this.logger.warn(
            `No se pudo generar PDF para chat ${chat.id}: ${pdfError.message}`,
          );
        }
      }

      // 2. Transición a estado cerrado
      await this.chatStateService.transition(
        chat.id,
        'closed' as any,
        'closed_auto',
        {
          reason: `Chat cerrado automáticamente por inactividad de ${this.AUTO_CLOSE_HOURS} horas`,
          triggeredBy: 'system',
          agentId: chat.assignedAgentId,
        },
      );

      // 3. Emitir evento de auto-cierre
      this.eventEmitter.emit('chat.auto.closed', {
        chatId: chat.id,
        agentId: chat.assignedAgentId,
        inactiveHours: this.AUTO_CLOSE_HOURS,
        lastActivity: chat.lastClientMessageAt || chat.lastAgentMessageAt,
      });

      this.logger.log(`✅ Chat ${chat.id} cerrado automáticamente`);
    } catch (error) {
      this.logger.error(
        `Error en auto-cierre de chat ${chat.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Programar auto-cierre para un chat específico
   */
  async scheduleAutoClose(chatId: number) {
    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + this.AUTO_CLOSE_HOURS);

    await this.chatRepository.update(chatId, {
      autoCloseScheduledAt: scheduledAt,
    });

    this.logger.log(
      `📅 Auto-cierre programado para chat ${chatId} a las ${scheduledAt.toISOString()}`,
    );
  }

  /**
   * Cancelar auto-cierre programado
   */
  async cancelAutoClose(chatId: number) {
    await this.chatRepository.update(chatId, {
      autoCloseScheduledAt: null,
    });

    this.logger.log(`❌ Auto-cierre cancelado para chat ${chatId}`);
  }

  /**
   * Obtener chats próximos a cerrarse (para mostrar en UI)
   */
  async getUpcomingAutoClose(hours: number = 2): Promise<Chat[]> {
    const now = new Date();
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - (this.AUTO_CLOSE_HOURS - hours));

    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.assignedAgent', 'agent')
      .leftJoinAndSelect('chat.debtor', 'debtor')
      .where('chat.status IN (:...statuses)', {
        statuses: ['active', 'waiting', 'pending'],
      })
      .andWhere(
        '(chat.lastClientMessageAt < :threshold OR chat.lastAgentMessageAt < :threshold)',
        { threshold },
      )
      .orderBy('chat.lastClientMessageAt', 'ASC')
      .take(50)
      .getMany();

    return chats.map((chat) => {
      const lastActivity =
        chat.lastClientMessageAt > chat.lastAgentMessageAt
          ? chat.lastClientMessageAt
          : chat.lastAgentMessageAt;

      const hoursInactive = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60),
      );

      const hoursRemaining = this.AUTO_CLOSE_HOURS - hoursInactive;

      return {
        ...chat,
        hoursInactive,
        hoursRemaining: Math.max(0, hoursRemaining),
        willCloseAt: new Date(
          lastActivity.getTime() + this.AUTO_CLOSE_HOURS * 60 * 60 * 1000,
        ),
      } as any;
    });
  }

  /**
   * Obtener estadísticas de auto-cierre
   */
  async getAutoCloseStats(startDate: Date, endDate: Date) {
    const autoClosed = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.subStatus = :status', { status: 'closed_auto' })
      .andWhere('chat.closedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getCount();

    const avgHoursToClose = await this.chatRepository
      .createQueryBuilder('chat')
      .select(
        'AVG(EXTRACT(EPOCH FROM (chat.closedAt - chat.lastClientMessageAt)) / 3600)',
        'avgHours',
      )
      .where('chat.subStatus = :status', { status: 'closed_auto' })
      .andWhere('chat.closedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      totalAutoClosed: autoClosed,
      averageHoursToClose: parseFloat(avgHoursToClose?.avgHours || '0'),
      autoCloseThreshold: this.AUTO_CLOSE_HOURS,
    };
  }
}
