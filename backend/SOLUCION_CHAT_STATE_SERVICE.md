# SOLUCIÓN 2: Servicio de Transiciones de Estado

## 🎯 ChatStateService - Controlador Central de Estados

```typescript
// backend/src/modules/chats/services/chat-state.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus, ChatSubStatus } from '../entities/chat.entity';
import { ChatStateTransition } from '../entities/chat-state-transition.entity';

interface TransitionOptions {
  reason?: string;
  triggeredBy: 'bot' | 'agent' | 'system' | 'supervisor';
  agentId?: string;
  metadata?: any;
}

@Injectable()
export class ChatStateService {
  private readonly logger = new Logger(ChatStateService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatStateTransition)
    private transitionRepository: Repository<ChatStateTransition>,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
  ) {}

  /**
   * 🔄 Transición segura de estado con validación y auditoría
   */
  async transition(
    chatId: string,
    toStatus: ChatStatus,
    toSubStatus?: ChatSubStatus,
    options?: TransitionOptions,
  ): Promise<Chat> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cargar chat actual
      const chat = await queryRunner.manager.findOne(Chat, {
        where: { id: chatId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!chat) {
        throw new Error(`Chat ${chatId} no encontrado`);
      }

      const fromStatus = chat.status;
      const fromSubStatus = chat.subStatus;

      // 2. Validar transición permitida
      this.validateTransition(fromStatus, toStatus, options?.triggeredBy);

      // 3. Aplicar cambios de estado
      chat.status = toStatus;
      if (toSubStatus) {
        chat.subStatus = toSubStatus;
      }

      // 4. Actualizar campos relacionados según el estado
      this.updateRelatedFields(chat, toStatus, toSubStatus);

      // 5. Guardar chat actualizado
      await queryRunner.manager.save(chat);

      // 6. Registrar transición en auditoría
      const transition = this.transitionRepository.create({
        chatId,
        fromStatus,
        toStatus,
        fromSubStatus,
        toSubStatus,
        reason: options?.reason || `Transición de ${fromStatus} a ${toStatus}`,
        triggeredBy: options?.triggeredBy,
        agentId: options?.agentId,
        metadata: options?.metadata,
      });
      await queryRunner.manager.save(transition);

      await queryRunner.commitTransaction();

      // 7. Emitir eventos para listeners
      this.emitStateEvents(chat, fromStatus, toStatus, options);

      this.logger.log(
        `✅ Chat ${chatId}: ${fromStatus} → ${toStatus} | Razón: ${options?.reason} | Por: ${options?.triggeredBy}`,
      );

      return chat;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `❌ Error en transición de chat ${chatId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🛡️ Validación de transiciones permitidas
   */
  private validateTransition(
    from: ChatStatus,
    to: ChatStatus,
    triggeredBy: string,
  ): void {
    const allowedTransitions: Record<ChatStatus, ChatStatus[]> = {
      [ChatStatus.BOT_INITIAL]: [
        ChatStatus.BOT_VALIDATING,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.BOT_VALIDATING]: [
        ChatStatus.BOT_WAITING_QUEUE,
        ChatStatus.AGENT_ASSIGNED,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.BOT_WAITING_QUEUE]: [
        ChatStatus.AGENT_ASSIGNED,
        ChatStatus.CLOSED,
        ChatStatus.SYSTEM_TIMEOUT,
      ],
      [ChatStatus.AGENT_ASSIGNED]: [
        ChatStatus.AGENT_RESPONDING,
        ChatStatus.TRANSFERRING,
        ChatStatus.BOT_INITIAL, // Retorno al bot
        ChatStatus.CLOSING,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.AGENT_RESPONDING]: [
        ChatStatus.AGENT_WAITING_CLIENT,
        ChatStatus.TRANSFERRING,
        ChatStatus.BOT_INITIAL, // Retorno al bot
        ChatStatus.CLOSING,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.AGENT_WAITING_CLIENT]: [
        ChatStatus.AGENT_RESPONDING,
        ChatStatus.CLIENT_INACTIVE,
        ChatStatus.TRANSFERRING,
        ChatStatus.BOT_INITIAL, // Retorno al bot
        ChatStatus.CLOSING,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.TRANSFERRING]: [
        ChatStatus.AGENT_ASSIGNED,
        ChatStatus.BOT_WAITING_QUEUE,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.CLOSING]: [ChatStatus.CLOSED],
      [ChatStatus.CLOSED]: [ChatStatus.BOT_INITIAL], // Reapertura
      [ChatStatus.CLIENT_INACTIVE]: [
        ChatStatus.AGENT_RESPONDING,
        ChatStatus.CLOSING,
        ChatStatus.CLOSED,
      ],
      [ChatStatus.SYSTEM_TIMEOUT]: [ChatStatus.CLOSED],
    };

    const allowed = allowedTransitions[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(
        `Transición no permitida: ${from} → ${to} (Iniciada por: ${triggeredBy})`,
      );
    }
  }

  /**
   * 🔧 Actualizar campos relacionados según el nuevo estado
   */
  private updateRelatedFields(
    chat: Chat,
    status: ChatStatus,
    subStatus?: ChatSubStatus,
  ): void {
    const now = new Date();

    switch (status) {
      case ChatStatus.BOT_INITIAL:
        chat.isBotActive = true;
        chat.assignedAgentId = null;
        chat.assignedAt = null;
        chat.botRestartCount = (chat.botRestartCount || 0) + 1;
        chat.agentWarningSent = false;
        chat.clientWarningSent = false;
        break;

      case ChatStatus.BOT_WAITING_QUEUE:
        chat.isBotActive = false;
        chat.subStatus = ChatSubStatus.AWAITING_AGENT;
        // No asignar agente aún
        break;

      case ChatStatus.AGENT_ASSIGNED:
        chat.isBotActive = false;
        chat.assignedAt = now;
        chat.subStatus = ChatSubStatus.FIRST_RESPONSE_PENDING;
        chat.agentWarningSent = false;
        chat.clientWarningSent = false;
        break;

      case ChatStatus.AGENT_RESPONDING:
        chat.lastAgentMessageAt = now;
        chat.subStatus = ChatSubStatus.IN_CONVERSATION;
        chat.agentWarningSent = false;
        break;

      case ChatStatus.AGENT_WAITING_CLIENT:
        chat.lastAgentMessageAt = now;
        chat.clientWarningSent = false;
        // Programar auto-cierre en 6 minutos
        chat.autoCloseScheduledAt = new Date(now.getTime() + 6 * 60 * 1000);
        break;

      case ChatStatus.TRANSFERRING:
        chat.transferCount = (chat.transferCount || 0) + 1;
        break;

      case ChatStatus.CLOSING:
        // No cambiar otros campos, solo el estado
        break;

      case ChatStatus.CLOSED:
        chat.closedAt = now;
        chat.isBotActive = false;
        chat.autoCloseScheduledAt = null;
        break;

      case ChatStatus.CLIENT_INACTIVE:
        chat.subStatus = ChatSubStatus.TIMEOUT_CLIENT;
        break;

      case ChatStatus.SYSTEM_TIMEOUT:
        chat.subStatus = ChatSubStatus.AUTO_CLOSED_24H;
        chat.closedAt = now;
        break;
    }

    chat.updatedAt = now;
  }

  /**
   * 📡 Emitir eventos para otros servicios
   */
  private emitStateEvents(
    chat: Chat,
    fromStatus: ChatStatus,
    toStatus: ChatStatus,
    options?: TransitionOptions,
  ): void {
    // Evento general de cambio de estado
    this.eventEmitter.emit('chat.state.changed', {
      chatId: chat.id,
      fromStatus,
      toStatus,
      chat,
      options,
    });

    // Eventos específicos por tipo de transición
    if (toStatus === ChatStatus.BOT_WAITING_QUEUE) {
      this.eventEmitter.emit('chat.waiting.assignment', { chat });
    }

    if (toStatus === ChatStatus.AGENT_ASSIGNED) {
      this.eventEmitter.emit('chat.agent.assigned', {
        chat,
        agentId: chat.assignedAgentId,
      });
    }

    if (toStatus === ChatStatus.TRANSFERRING) {
      this.eventEmitter.emit('chat.transferring', { chat, options });
    }

    if (toStatus === ChatStatus.BOT_INITIAL && fromStatus !== ChatStatus.CLOSED) {
      this.eventEmitter.emit('chat.returned.to.bot', { chat, options });
    }

    if (toStatus === ChatStatus.CLOSING) {
      this.eventEmitter.emit('chat.closing', { chat, options });
    }

    if (toStatus === ChatStatus.CLOSED) {
      this.eventEmitter.emit('chat.closed', { chat, fromStatus, options });
    }
  }

  /**
   * 📊 Obtener historial de transiciones de un chat
   */
  async getTransitionHistory(chatId: string): Promise<ChatStateTransition[]> {
    return this.transitionRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔍 Verificar si una transición es válida sin ejecutarla
   */
  canTransition(from: ChatStatus, to: ChatStatus): boolean {
    try {
      this.validateTransition(from, to, 'system');
      return true;
    } catch {
      return false;
    }
  }
}
```

## 📦 Entity para Auditoría de Transiciones

```typescript
// backend/src/modules/chats/entities/chat-state-transition.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_state_transitions')
@Index(['chatId', 'createdAt'])
export class ChatStateTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fromStatus: string;

  @Column({ type: 'varchar', length: 50 })
  toStatus: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fromSubStatus: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  toSubStatus: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 50 })
  triggeredBy: string; // 'bot', 'agent', 'system', 'supervisor'

  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
```
