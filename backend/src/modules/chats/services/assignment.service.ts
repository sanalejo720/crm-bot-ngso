import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { User } from '../../users/entities/user.entity';
import { ChatStateService } from './chat-state.service';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
  ) {}

  /**
   * Asignar un chat a un agente específico
   */
  async assignChatToAgent(
    chatId: string,
    agentId: string,
    assignedBy: string,
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'campaign'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`);
    }

    // Verificar que el chat esté en cola de espera
    if (chat.status !== 'bot' || chat.subStatus !== 'bot_waiting_queue') {
      throw new BadRequestException(
        `El chat debe estar en estado BOT_WAITING_QUEUE para asignarse. Estado actual: ${chat.status}/${chat.subStatus}`
      );
    }

    // Verificar que el agente existe y está disponible
    const agent = await this.userRepository.findOne({
      where: { id: agentId, isAgent: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agente ${agentId} no encontrado o no disponible`);
    }

    // Verificar capacidad del agente
    if (agent.currentChatsCount >= agent.maxConcurrentChats) {
      throw new BadRequestException(
        `El agente ${agent.fullName} ha alcanzado su capacidad máxima de chats (${agent.maxConcurrentChats})`
      );
    }

    // Transicionar el estado usando ChatStateService
    await this.chatStateService.transition(
      chatId,
      'waiting' as any,
      'waiting_agent_response',
      {
        reason: 'Asignación manual de chat desde cola de espera',
        triggeredBy: 'supervisor',
        agentId: assignedBy,
      },
    );

    // Actualizar el assignedAgentId en el chat
    await this.chatRepository.update(chatId, {
      assignedAgentId: agentId,
    });

    // Incrementar contador de chats del agente
    await this.userRepository.increment(
      { id: agentId },
      'currentChatsCount',
      1,
    );

    this.logger.log(
      `✅ Chat ${chatId} asignado a agente ${agent.fullName} (${agentId}) por ${assignedBy}`
    );

    return this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['assignedAgent', 'campaign', 'debtor'],
    });
  }

  /**
   * Obtener la cola de chats en espera
   */
  async getWaitingQueue(campaignId?: string): Promise<Chat[]> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.debtor', 'debtor')
      .leftJoinAndSelect('chat.campaign', 'campaign')
      .where('chat.status = :status', { status: 'bot' })
      .andWhere('chat.subStatus = :subStatus', { subStatus: 'bot_waiting_queue' })
      .andWhere('chat.assignedAgentId IS NULL')
      .orderBy('chat.priority', 'DESC')
      .addOrderBy('chat.createdAt', 'ASC');

    if (campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId });
    }

    return query.getMany();
  }

  /**
   * Encontrar un agente disponible automáticamente
   * (para uso futuro - asignación automática inteligente)
   */
  async findAvailableAgent(campaignId?: string): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.isAgent = :isAgent', { isAgent: true })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.agentState = :agentState', { agentState: 'available' })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats');

    if (campaignId) {
      query.andWhere('user.campaignId = :campaignId', { campaignId });
    }

    // Ordenar por menor carga de trabajo
    query.orderBy('user.currentChatsCount', 'ASC');

    return query.getOne();
  }

  /**
   * Calcular prioridad de un chat
   */
  calculatePriority(chat: Chat): number {
    let priority = 0;

    // Base: tiempo de espera (más antiguo = mayor prioridad)
    const waitingTimeMinutes = (Date.now() - chat.createdAt.getTime()) / 60000;
    priority += Math.floor(waitingTimeMinutes);

    // Prioridad base por tiempo
    return priority;
  }

  /**
   * Actualizar prioridades de todos los chats en cola
   */
  async updateQueuePriorities(): Promise<void> {
    const waitingChats = await this.getWaitingQueue();

    for (const chat of waitingChats) {
      const newPriority = this.calculatePriority(chat);
      await this.chatRepository.update(chat.id, { priority: newPriority });
    }

    this.logger.log(`📊 Prioridades actualizadas para ${waitingChats.length} chats en cola`);
  }
}
