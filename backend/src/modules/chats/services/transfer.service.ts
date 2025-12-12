import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { User } from '../../users/entities/user.entity';
import { ChatStateService } from './chat-state.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageType } from '../../messages/entities/message.entity';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
    private whatsappService: WhatsappService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Transferir un chat a otro agente
   * - Usa estado temporal TRANSFERRING
   * - Notifica a ambos agentes vía WebSocket
   * - Envía mensaje al cliente sobre la transferencia
   */
  async transferChat(
    chatId: string,
    newAgentId: string,
    currentAgentId: string,
    reason: string,
    notes?: string,
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'campaign', 'whatsappNumber', 'debtor'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`);
    }

    // Verificar que el chat esté asignado al agente actual
    if (chat.assignedAgentId !== currentAgentId) {
      throw new BadRequestException(
        'Solo puedes transferir chats asignados a ti'
      );
    }

    // Verificar que el chat esté en estado válido para transferir
    const validStatuses = ['waiting', 'active', 'pending'];
    if (!validStatuses.includes(chat.status)) {
      throw new BadRequestException(
        `No se puede transferir un chat en estado ${chat.status}`
      );
    }

    // Verificar que el nuevo agente existe y está disponible
    const newAgent = await this.userRepository.findOne({
      where: { id: newAgentId, isAgent: true, status: 'active' as any },
    });

    if (!newAgent) {
      throw new NotFoundException('Agente destino no encontrado o no disponible');
    }

    // Verificar capacidad del nuevo agente
    if (newAgent.currentChatsCount >= newAgent.maxConcurrentChats) {
      throw new BadRequestException(
        `El agente ${newAgent.fullName} ha alcanzado su capacidad máxima (${newAgent.maxConcurrentChats} chats)`
      );
    }

    this.logger.log(
      `🔄 Iniciando transferencia del chat ${chatId} de ${chat.assignedAgent?.fullName} a ${newAgent.fullName}`
    );

    try {
      // 1. Transicionar a estado TRANSFERRING temporal
      await this.chatStateService.transition(
        chatId,
        'active' as any,
        'transferring',
        {
          reason: `Transferencia: ${reason}${notes ? ' - ' + notes : ''}`,
          triggeredBy: 'agent',
          agentId: currentAgentId,
        },
      );

      // 2. Notificar al agente actual que está transfiriendo
      this.eventEmitter.emit('chat.transfer.initiated', {
        chatId,
        fromAgentId: currentAgentId,
        toAgentId: newAgentId,
        reason,
      });

      // 3. Enviar mensaje al cliente sobre la transferencia
      if (chat.whatsappNumber?.id) {
        const clientMessage = `Tu conversación está siendo transferida a ${newAgent.fullName}. En un momento te atenderá. ⏳`;
        await this.whatsappService.sendMessage(
          chat.whatsappNumber.id,
          chat.contactPhone,
          clientMessage,
          MessageType.TEXT,
        );
      }

      // 4. Actualizar asignación del chat
      await this.chatRepository.update(chatId, {
        assignedAgentId: newAgentId,
      });

      // 5. Actualizar contadores de ambos agentes
      // Decrementar del agente actual
      await this.userRepository.decrement(
        { id: currentAgentId },
        'currentChatsCount',
        1,
      );

      // Incrementar al nuevo agente
      await this.userRepository.increment(
        { id: newAgentId },
        'currentChatsCount',
        1,
      );

      // 6. Incrementar contador de transferencias del chat
      await this.chatRepository.increment(
        { id: chatId },
        'transferCount',
        1,
      );

      // 7. Transicionar a estado ACTIVE con el nuevo agente
      await this.chatStateService.transition(
        chatId,
        'active' as any,
        'active_conversation',
        {
          reason: `Chat transferido exitosamente a ${newAgent.fullName}`,
          triggeredBy: 'system',
          agentId: newAgentId,
        },
      );

      // 8. Notificar al nuevo agente sobre el chat transferido
      this.eventEmitter.emit('chat.transfer.completed', {
        chatId,
        fromAgentId: currentAgentId,
        toAgentId: newAgentId,
        reason,
        chat,
      });

      this.logger.log(
        `✅ Chat ${chatId} transferido exitosamente de ${chat.assignedAgent?.fullName} a ${newAgent.fullName}`
      );

      return this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['assignedAgent', 'campaign', 'debtor'],
      });
    } catch (error) {
      this.logger.error(
        `❌ Error transfiriendo chat ${chatId}: ${error.message}`,
        error.stack,
      );

      // Revertir a estado activo si falla
      try {
        await this.chatStateService.transition(
          chatId,
          'active' as any,
          'active_conversation',
          {
            reason: 'Transferencia fallida, revertida a estado activo',
            triggeredBy: 'system',
            agentId: currentAgentId,
          },
        );
      } catch (revertError) {
        this.logger.error('Error revirtiendo estado después de fallo', revertError);
      }

      throw error;
    }
  }

  /**
   * Obtener historial de transferencias de un chat
   */
  async getTransferHistory(chatId: string) {
    const transitions = await this.chatRepository.manager.query(
      `SELECT 
        cst.*,
        u."fullName" as "agentName"
      FROM chat_state_transitions cst
      LEFT JOIN users u ON u.id = cst."agentId"
      WHERE cst."chatId" = $1 
        AND cst."toSubStatus" = 'transferring'
      ORDER BY cst."createdAt" DESC`,
      [chatId],
    );

    return transitions;
  }

  /**
   * Obtener estadísticas de transferencias
   */
  async getTransferStats(agentId?: string, startDate?: Date, endDate?: Date) {
    let query = `
      SELECT 
        COUNT(*) as "totalTransfers",
        COUNT(DISTINCT "chatId") as "uniqueChats",
        AVG(c."transferCount") as "avgTransfersPerChat"
      FROM chat_state_transitions cst
      JOIN chats c ON c.id = cst."chatId"
      WHERE cst."toSubStatus" = 'transferring'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (agentId) {
      query += ` AND cst."agentId" = $${paramIndex}`;
      params.push(agentId);
      paramIndex++;
    }

    if (startDate && endDate) {
      query += ` AND cst."createdAt" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
    }

    const result = await this.chatRepository.manager.query(query, params);
    return result[0];
  }
}
