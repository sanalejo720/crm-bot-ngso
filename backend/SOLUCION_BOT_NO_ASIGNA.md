# SOLUCIÓN 3: Bot NO Asigna - Solo Valida y Encola

## 🤖 Corrección del BotExecutorService

```typescript
// backend/src/modules/bot/bot-executor.service.ts
// Fragmento corregido para el flujo de validación

import { ChatStateService } from '../chats/services/chat-state.service';
import { ChatStatus, ChatSubStatus } from '../chats/entities/chat.entity';

@Injectable()
export class BotExecutorService {
  constructor(
    private chatStateService: ChatStateService,
    private whatsappService: WhatsappService,
    private messagesService: MessagesService,
    // ... otras dependencias
  ) {}

  /**
   * 🎯 Cuando el usuario completa la validación de documento
   */
  async handleDocumentValidated(chat: Chat, debtor: any): Promise<void> {
    this.logger.log(
      `📋 [BOT] Documento validado para chat ${chat.id} - Deudor: ${debtor.fullName}`,
    );

    try {
      // 1. Enviar mensaje de espera al cliente
      const waitingMessage = `✅ *Gracias, ${debtor.fullName}*

Hemos verificado tu información correctamente.

📋 *Deuda pendiente:* $${Number(debtor.debtAmount).toLocaleString('es-CO')}
📅 *Días de mora:* ${debtor.daysOverdue} días

🕐 *En este momento estamos asignando un asesor especializado.*

Por favor espera unos instantes mientras te conectamos.

_Tiempo estimado de espera: 1-3 minutos_`;

      await this.sendBotMessage(chat, waitingMessage);

      // 2. Transicionar a cola de espera (NO asignar agente todavía)
      await this.chatStateService.transition(
        chat.id,
        ChatStatus.BOT_WAITING_QUEUE,
        ChatSubStatus.AWAITING_AGENT,
        {
          reason: 'Documento validado - Cliente en cola de asignación',
          triggeredBy: 'bot',
          metadata: {
            debtorId: debtor.id,
            documentNumber: debtor.documentNumber,
            debtAmount: debtor.debtAmount,
          },
        },
      );

      // 3. Emitir evento para que supervisor vea el chat en cola
      this.eventEmitter.emit('chat.ready.for.assignment', {
        chatId: chat.id,
        debtor,
        priority: this.calculatePriority(debtor),
      });

      this.logger.log(
        `✅ [BOT] Chat ${chat.id} encolado exitosamente - Esperando asignación manual`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [BOT] Error al encolar chat ${chat.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 📊 Calcular prioridad del chat para asignación
   */
  private calculatePriority(debtor: any): number {
    // Prioridad basada en monto de deuda y días de mora
    const debtAmount = Number(debtor.debtAmount);
    const daysOverdue = Number(debtor.daysOverdue);

    let priority = 0;

    // Deuda alta = mayor prioridad
    if (debtAmount > 5000000) priority += 3;
    else if (debtAmount > 2000000) priority += 2;
    else priority += 1;

    // Mora alta = mayor prioridad
    if (daysOverdue > 180) priority += 3;
    else if (daysOverdue > 90) priority += 2;
    else priority += 1;

    return priority;
  }

  /**
   * ❌ NO HACER: Auto-asignación de agente
   * El bot NUNCA debe asignar agentes automáticamente
   */
  // ❌ ELIMINAR esta lógica:
  // private async autoAssignAgent(chat: Chat): Promise<void> {
  //   const availableAgent = await this.findAvailableAgent();
  //   chat.assignedAgentId = availableAgent.id;
  //   ...
  // }
}
```

## 🎛️ AssignmentService - Servicio de Asignación Manual

```typescript
// backend/src/modules/chats/services/assignment.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus, ChatSubStatus } from '../entities/chat.entity';
import { User } from '../../users/entities/user.entity';
import { ChatStateService } from './chat-state.service';
import { GatewayService } from '../../gateway/gateway.service';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
    private gatewayService: GatewayService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 👤 Asignar chat a agente (solo desde supervisor/admin)
   */
  async assignChatToAgent(
    chatId: string,
    agentId: string,
    assignedBy: string, // supervisor/admin ID
  ): Promise<Chat> {
    this.logger.log(
      `🎯 [ASSIGNMENT] Asignando chat ${chatId} a agente ${agentId}`,
    );

    // 1. Validar que el chat esté en cola
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'client', 'debtor'],
    });

    if (!chat) {
      throw new BadRequestException(`Chat ${chatId} no encontrado`);
    }

    if (chat.status !== ChatStatus.BOT_WAITING_QUEUE) {
      throw new BadRequestException(
        `Chat ${chatId} no está en cola de asignación. Estado actual: ${chat.status}`,
      );
    }

    // 2. Validar que el agente existe y está disponible
    const agent = await this.userRepository.findOne({
      where: { id: agentId, isAgent: true },
    });

    if (!agent) {
      throw new BadRequestException(`Agente ${agentId} no encontrado`);
    }

    if (agent.agentState !== 'available') {
      throw new BadRequestException(
        `Agente ${agent.fullName} no está disponible (Estado: ${agent.agentState})`,
      );
    }

    if (agent.currentChatsCount >= agent.maxConcurrentChats) {
      throw new BadRequestException(
        `Agente ${agent.fullName} alcanzó el límite de chats (${agent.currentChatsCount}/${agent.maxConcurrentChats})`,
      );
    }

    // 3. Asignar el chat al agente
    chat.assignedAgentId = agentId;
    chat.assignedAgent = agent;

    // 4. Incrementar contador del agente
    agent.currentChatsCount += 1;
    await this.userRepository.save(agent);

    // 5. Transicionar estado
    await this.chatStateService.transition(
      chatId,
      ChatStatus.AGENT_ASSIGNED,
      ChatSubStatus.FIRST_RESPONSE_PENDING,
      {
        reason: `Asignado a ${agent.fullName}`,
        triggeredBy: 'supervisor',
        agentId: assignedBy,
        metadata: {
          agentName: agent.fullName,
          agentEmail: agent.email,
        },
      },
    );

    // 6. Enviar notificación al cliente
    const assignmentMessage = `✅ *¡Has sido conectado con un asesor!*

👤 *Asesor asignado:* ${agent.fullName}
🎫 *Número de ticket:* ${chat.id.substring(0, 8).toUpperCase()}

Nuestro asesor te atenderá en breve. Por favor, describe tu consulta o situación actual.`;

    await this.sendMessage(chat, assignmentMessage);

    // 7. Notificar al agente por WebSocket
    this.gatewayService.notifyAgentNewChat(agentId, chat);

    // 8. Reproducir sonido de notificación
    this.gatewayService.playSoundNotification(agentId, 'new-chat');

    // 9. Notificación del navegador
    this.gatewayService.sendBrowserNotification(agentId, {
      title: 'Nuevo chat asignado',
      body: `${chat.contactName} - ${chat.debtor?.fullName || 'Sin deudor'}`,
      icon: '/assets/icons/chat.png',
    });

    this.logger.log(
      `✅ [ASSIGNMENT] Chat ${chatId} asignado exitosamente a ${agent.fullName}`,
    );

    return chat;
  }

  /**
   * 📋 Obtener chats en cola de asignación
   */
  async getWaitingQueue(): Promise<Chat[]> {
    return this.chatRepository.find({
      where: {
        status: ChatStatus.BOT_WAITING_QUEUE,
      },
      relations: ['client', 'debtor', 'campaign'],
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * 🔍 Buscar agente disponible automáticamente (opcional)
   */
  async findAvailableAgent(campaignId?: string): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.isAgent = :isAgent', { isAgent: true })
      .andWhere('user.agentState = :state', { state: 'available' })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats');

    if (campaignId) {
      query.andWhere('user.campaignId = :campaignId', { campaignId });
    }

    query.orderBy('user.currentChatsCount', 'ASC').addOrderBy('RANDOM()');

    return query.getOne();
  }

  private async sendMessage(chat: Chat, content: string): Promise<void> {
    // Implementación de envío de mensaje
    // ... código de WhatsApp service
  }
}
```

## 🖥️ Endpoint del Controller

```typescript
// backend/src/modules/chats/chats.controller.ts

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatsController {
  constructor(private assignmentService: AssignmentService) {}

  /**
   * 🎯 Asignar chat a agente (solo supervisores/admins)
   */
  @Post(':chatId/assign')
  @Permissions('chats:assign')
  async assignChat(
    @Param('chatId') chatId: string,
    @Body() dto: { agentId: string },
    @Req() req: any,
  ) {
    const chat = await this.assignmentService.assignChatToAgent(
      chatId,
      dto.agentId,
      req.user.id,
    );

    return {
      success: true,
      message: 'Chat asignado exitosamente',
      data: chat,
    };
  }

  /**
   * 📋 Obtener cola de chats esperando asignación
   */
  @Get('waiting-queue')
  @Permissions('chats:view-queue')
  async getWaitingQueue() {
    const chats = await this.assignmentService.getWaitingQueue();
    return {
      success: true,
      data: chats,
      count: chats.length,
    };
  }
}
```
