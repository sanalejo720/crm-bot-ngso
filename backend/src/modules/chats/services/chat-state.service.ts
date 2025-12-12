import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus } from '../entities/chat.entity';
import { ChatStateTransition } from '../entities/chat-state-transition.entity';

interface TransitionMetadata {
  reason: string;
  triggeredBy: 'system' | 'agent' | 'supervisor' | 'bot' | 'client';
  agentId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatStateService {
  private readonly logger = new Logger(ChatStateService.name);

  // Matriz de transiciones permitidas
  private readonly allowedTransitions: Record<string, string[]> = {
    [ChatStatus.BOT]: [
      ChatStatus.ACTIVE,
      ChatStatus.WAITING,
      ChatStatus.CLOSED,
    ],
    [ChatStatus.WAITING]: [
      ChatStatus.ACTIVE,
      ChatStatus.BOT,
      ChatStatus.CLOSED,
    ],
    [ChatStatus.ACTIVE]: [
      ChatStatus.PENDING,
      ChatStatus.RESOLVED,
      ChatStatus.CLOSED,
      ChatStatus.BOT, // Para retornar al bot
    ],
    [ChatStatus.PENDING]: [
      ChatStatus.ACTIVE,
      ChatStatus.CLOSED,
    ],
    [ChatStatus.RESOLVED]: [
      ChatStatus.ACTIVE,
      ChatStatus.CLOSED,
    ],
    [ChatStatus.CLOSED]: [], // Estado final
  };

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatStateTransition)
    private transitionRepository: Repository<ChatStateTransition>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Transicionar un chat a un nuevo estado con seguridad transaccional
   */
  async transition(
    chatId: string,
    newStatus: ChatStatus,
    subStatus?: string,
    metadata?: TransitionMetadata,
  ): Promise<Chat> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener chat con lock pessimistic
      const chat = await queryRunner.manager.findOne(Chat, {
        where: { id: chatId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!chat) {
        throw new BadRequestException(`Chat ${chatId} no encontrado`);
      }

      const oldStatus = chat.status;
      const oldSubStatus = chat.subStatus;

      // Validar transición
      if (!this.validateTransition(oldStatus, newStatus)) {
        throw new BadRequestException(
          `Transición inválida: ${oldStatus} → ${newStatus}`,
        );
      }

      this.logger.log(
        `[ChatStateService] Transitioning chat ${chatId}: ${oldStatus} → ${newStatus}`,
      );

      // Actualizar estado
      chat.status = newStatus;
      chat.subStatus = subStatus;

      // Actualizar campos relacionados automáticamente
      this.updateRelatedFields(chat, newStatus);

      // Guardar chat
      await queryRunner.manager.save(Chat, chat);

      // Crear registro de auditoría
      const transition = this.transitionRepository.create({
        chatId: chat.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
        fromSubStatus: oldSubStatus,
        toSubStatus: subStatus,
        reason: metadata?.reason || 'Sin motivo especificado',
        triggeredBy: metadata?.triggeredBy || 'system',
        agentId: metadata?.agentId,
        metadata: metadata?.metadata || {},
      });

      await queryRunner.manager.save(ChatStateTransition, transition);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Emitir eventos
      this.emitStateEvents(chat, oldStatus, newStatus, metadata);

      this.logger.log(
        `✅ [ChatStateService] Chat ${chatId} transitioned successfully`,
      );

      return chat;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `❌ [ChatStateService] Error transitioning chat ${chatId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validar si una transición de estado es permitida
   */
  private validateTransition(
    fromStatus: ChatStatus,
    toStatus: ChatStatus,
  ): boolean {
    const allowed = this.allowedTransitions[fromStatus];
    return allowed?.includes(toStatus) ?? false;
  }

  /**
   * Actualizar campos relacionados según el nuevo estado
   */
  private updateRelatedFields(chat: Chat, newStatus: ChatStatus): void {
    const now = new Date();

    switch (newStatus) {
      case ChatStatus.ACTIVE:
        if (!chat.assignedAt) {
          chat.assignedAt = now;
        }
        chat.isBotActive = false;
        break;

      case ChatStatus.BOT:
        chat.isBotActive = true;
        chat.assignedAgentId = null;
        chat.assignedAgent = null;
        break;

      case ChatStatus.RESOLVED:
        chat.resolvedAt = now;
        break;

      case ChatStatus.CLOSED:
        chat.closedAt = now;
        chat.isBotActive = false;
        break;

      case ChatStatus.PENDING:
        // Chat esperando respuesta del cliente
        break;
    }
  }

  /**
   * Emitir eventos según el tipo de transición
   */
  private emitStateEvents(
    chat: Chat,
    oldStatus: ChatStatus,
    newStatus: ChatStatus,
    metadata?: TransitionMetadata,
  ): void {
    // Evento general
    this.eventEmitter.emit('chat.state.changed', {
      chat,
      oldStatus,
      newStatus,
      metadata,
    });

    // Eventos específicos
    if (newStatus === ChatStatus.ACTIVE && oldStatus === ChatStatus.WAITING) {
      this.eventEmitter.emit('chat.assigned', { chat });
    }

    if (newStatus === ChatStatus.CLOSED) {
      this.eventEmitter.emit('chat.closed', { chat });
    }

    if (newStatus === ChatStatus.BOT && oldStatus === ChatStatus.ACTIVE) {
      this.eventEmitter.emit('chat.returned.to.bot', { chat });
    }
  }

  /**
   * Obtener historial de transiciones de un chat
   */
  async getTransitionHistory(chatId: string): Promise<ChatStateTransition[]> {
    return this.transitionRepository.find({
      where: { chatId },
      relations: ['agent'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verificar si una transición es posible sin ejecutarla
   */
  canTransition(fromStatus: ChatStatus, toStatus: ChatStatus): boolean {
    return this.validateTransition(fromStatus, toStatus);
  }
}
