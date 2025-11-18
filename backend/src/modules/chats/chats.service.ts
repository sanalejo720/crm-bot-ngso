import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus } from './entities/chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { UsersService } from '../users/users.service';
import { User, AgentState } from '../users/entities/user.entity';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nuevo chat
   */
  async create(createChatDto: CreateChatDto): Promise<Chat> {
    // Verificar si ya existe un chat con ese externalId
    const existing = await this.chatRepository.findOne({
      where: { externalId: createChatDto.externalId },
    });

    if (existing) {
      this.logger.warn(`Chat con externalId ${createChatDto.externalId} ya existe`);
      return existing;
    }

    const chat = this.chatRepository.create({
      ...createChatDto,
      status: ChatStatus.WAITING,
    });

    const savedChat = await this.chatRepository.save(chat);

    this.logger.log(`Chat creado: ${savedChat.id} - ${savedChat.contactPhone}`);

    // Cargar relación campaign para el evento
    const chatWithCampaign = await this.chatRepository.findOne({
      where: { id: savedChat.id },
      relations: ['campaign'],
    });

    // Emitir evento para auto-asignación
    this.eventEmitter.emit('chat.created', chatWithCampaign);

    return savedChat;
  }

  /**
   * Obtener todos los chats con filtros
   */
  async findAll(filters?: {
    status?: ChatStatus;
    campaignId?: string;
    assignedAgentId?: string;
    whatsappNumberId?: string;
  }): Promise<Chat[]> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.campaign', 'campaign')
      .leftJoinAndSelect('chat.whatsappNumber', 'whatsappNumber')
      .leftJoinAndSelect('chat.assignedAgent', 'assignedAgent')
      .leftJoinAndSelect('chat.client', 'client')
      .orderBy('chat.lastMessageAt', 'DESC');

    if (filters?.status) {
      query.andWhere('chat.status = :status', { status: filters.status });
    }

    if (filters?.campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId: filters.campaignId });
    }

    if (filters?.assignedAgentId) {
      query.andWhere('chat.assignedAgentId = :assignedAgentId', {
        assignedAgentId: filters.assignedAgentId,
      });
    }

    if (filters?.whatsappNumberId) {
      query.andWhere('chat.whatsappNumberId = :whatsappNumberId', {
        whatsappNumberId: filters.whatsappNumberId,
      });
    }

    return query.getMany();
  }

  /**
   * Obtener chat por ID
   */
  async findOne(id: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id },
      relations: ['campaign', 'whatsappNumber', 'assignedAgent', 'client', 'messages'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat con ID ${id} no encontrado`);
    }

    return chat;
  }

  /**
   * Obtener chat por externalId
   */
  async findByExternalId(externalId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { externalId },
      relations: ['campaign', 'whatsappNumber', 'assignedAgent'],
    });
  }

  /**
   * Actualizar chat
   */
  async update(id: string, updateChatDto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findOne(id);

    Object.assign(chat, updateChatDto);

    const updatedChat = await this.chatRepository.save(chat);

    this.logger.log(`Chat actualizado: ${updatedChat.id}`);

    // Emitir evento de actualización
    this.eventEmitter.emit('chat.updated', updatedChat);

    return updatedChat;
  }

  /**
   * Asignar chat a un agente
   */
  async assign(chatId: string, agentId: string | null): Promise<Chat> {
    this.logger.log(`🎯 MÉTODO ASSIGN LLAMADO - Chat: ${chatId}, AgentId: ${agentId}`);
    const chat = await this.findOne(chatId);
    const previousAgentId = chat.assignedAgentId;
    this.logger.log(`📋 Chat encontrado. Estado actual: assignedAgentId=${previousAgentId}`);

    // Si agentId es null o vacío, desasignar el chat
    if (!agentId) {
      // Decrementar contador del agente anterior si existe
      if (previousAgentId) {
        await this.usersService.decrementChatCount(previousAgentId);
      }

      chat.assignedAgentId = null;
      chat.status = ChatStatus.WAITING;
      chat.assignedAt = null;

      await this.chatRepository.save(chat);
      this.logger.log(`Chat ${chatId} desasignado`);

      return this.findOne(chatId);
    }

    // Asignar a un agente específico
    const agent = await this.usersService.findOne(agentId);
    this.logger.log(`👤 Agente encontrado: ${agent.fullName} - Estado: ${agent.agentState} - Chats: ${agent.currentChatsCount}/${agent.maxConcurrentChats}`);

    if (agent.agentState !== AgentState.AVAILABLE) {
      this.logger.error(`❌ VALIDACIÓN FALLIDA: Agente ${agent.fullName} NO está disponible (estado: ${agent.agentState})`);
      throw new BadRequestException('El agente no está disponible');
    }

    if (agent.currentChatsCount >= agent.maxConcurrentChats) {
      this.logger.error(`❌ VALIDACIÓN FALLIDA: Agente ${agent.fullName} alcanzó límite ${agent.currentChatsCount}/${agent.maxConcurrentChats}`);
      throw new BadRequestException('El agente alcanzó su límite de chats concurrentes');
    }

    // Decrementar contador del agente anterior si es diferente
    if (previousAgentId && previousAgentId !== agentId) {
      await this.usersService.decrementChatCount(previousAgentId);
    }

    // Actualizar chat
    chat.assignedAgentId = agentId;
    chat.status = ChatStatus.ACTIVE;
    chat.assignedAt = new Date();

    await this.chatRepository.save(chat);

    // Incrementar contador del nuevo agente solo si es diferente
    if (previousAgentId !== agentId) {
      await this.usersService.incrementChatCount(agentId);
    }

    this.logger.log(`Chat ${chatId} asignado al agente ${agentId}`);

    // Emitir evento con formato correcto
    this.logger.log(`🔥 EMITIENDO EVENTO chat.assigned para agente ${agent.fullName} (${agent.id})`);
    this.eventEmitter.emit('chat.assigned', {
      chat: await this.findOne(chatId),
      agentId: agent.id,
      agentName: agent.fullName,
    });
    this.logger.log(`🔥 EVENTO EMITIDO correctamente`);

    return this.findOne(chatId);
  }

  /**
   * Transferir chat a otro agente
   */
  async transfer(
    chatId: string,
    currentAgentId: string,
    newAgentId: string,
    reason: string,
  ): Promise<Chat> {
    const chat = await this.findOne(chatId);
    const newAgent = await this.usersService.findOne(newAgentId);

    if (chat.assignedAgentId !== currentAgentId) {
      throw new BadRequestException('No tienes permiso para transferir este chat');
    }

    if (newAgent.currentChatsCount >= newAgent.maxConcurrentChats) {
      throw new BadRequestException('El nuevo agente alcanzó su límite de chats');
    }

    // Decrementar contador del agente actual
    await this.usersService.decrementChatCount(currentAgentId);

    // Actualizar chat
    chat.assignedAgentId = newAgentId;
    chat.metadata = {
      ...chat.metadata,
      transferHistory: [
        ...(chat.metadata?.transferHistory || []),
        {
          from: currentAgentId,
          to: newAgentId,
          reason,
          timestamp: new Date(),
        },
      ],
    };

    await this.chatRepository.save(chat);

    // Incrementar contador del nuevo agente
    await this.usersService.incrementChatCount(newAgentId);

    this.logger.log(`Chat ${chatId} transferido de ${currentAgentId} a ${newAgentId}`);

    // Emitir evento
    this.eventEmitter.emit('chat.transferred', {
      chat,
      fromAgent: currentAgentId,
      toAgent: newAgentId,
      reason,
    });

    return this.findOne(chatId);
  }

  /**
   * Cerrar chat
   */
  async close(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.findOne(chatId);

    if (chat.assignedAgentId) {
      await this.usersService.decrementChatCount(chat.assignedAgentId);
    }

    chat.status = ChatStatus.CLOSED;
    chat.closedAt = new Date();

    await this.chatRepository.save(chat);

    this.logger.log(`Chat ${chatId} cerrado por usuario ${userId}`);

    // Emitir evento
    this.eventEmitter.emit('chat.closed', chat);

    return chat;
  }

  /**
   * Resolver chat
   */
  async resolve(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.findOne(chatId);

    chat.status = ChatStatus.RESOLVED;
    chat.resolvedAt = new Date();

    await this.chatRepository.save(chat);

    this.logger.log(`Chat ${chatId} resuelto por usuario ${userId}`);

    // Emitir evento
    this.eventEmitter.emit('chat.resolved', chat);

    return chat;
  }

  /**
   * Obtener chats en cola (esperando asignación)
   */
  async getWaitingChats(campaignId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: {
        campaignId,
        status: ChatStatus.WAITING,
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Actualizar última actividad del chat
   */
  async updateLastActivity(chatId: string, messageText: string): Promise<void> {
    await this.chatRepository.update(chatId, {
      lastMessageText: messageText.substring(0, 255),
      lastMessageAt: new Date(),
    });
  }

  /**
   * Incrementar contador de mensajes no leídos
   */
  async incrementUnreadCount(chatId: string): Promise<void> {
    await this.chatRepository.increment({ id: chatId }, 'unreadCount', 1);
  }

  /**
   * Resetear contador de mensajes no leídos
   */
  async resetUnreadCount(chatId: string): Promise<void> {
    await this.chatRepository.update(chatId, { unreadCount: 0 });
  }

  /**
   * Obtener estadísticas de chats por agente
   */
  async getAgentStats(agentId: string) {
    const [active, resolved, total] = await Promise.all([
      this.chatRepository.count({
        where: { assignedAgentId: agentId, status: ChatStatus.ACTIVE },
      }),
      this.chatRepository.count({
        where: { assignedAgentId: agentId, status: ChatStatus.RESOLVED },
      }),
      this.chatRepository.count({ where: { assignedAgentId: agentId } }),
    ]);

    return { active, resolved, total };
  }
}
