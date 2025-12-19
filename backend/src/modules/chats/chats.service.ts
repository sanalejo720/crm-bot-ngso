import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Chat, ChatStatus } from './entities/chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { UsersService } from '../users/users.service';
import { User, AgentState } from '../users/entities/user.entity';
import { UserCampaign } from '../users/entities/user-campaign.entity';
import { Debtor } from '../debtors/entities/debtor.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { MessageType } from '../messages/entities/message.entity';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Debtor)
    private debtorRepository: Repository<Debtor>,
    @InjectRepository(UserCampaign)
    private userCampaignRepository: Repository<UserCampaign>,
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
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
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Chat[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
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

    // Búsqueda por texto (nombre, teléfono, documento)
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        `(LOWER(chat.contactName) LIKE :searchTerm 
         OR chat.contactPhone LIKE :searchTerm 
         OR chat.externalId LIKE :searchTerm
         OR LOWER(client.fullName) LIKE :searchTerm
         OR client.documentNumber LIKE :searchTerm
         OR client.phone LIKE :searchTerm)`,
        { searchTerm }
      );
    }

    // Paginación
    if (filters?.page && filters?.limit) {
      const skip = (filters.page - 1) * filters.limit;
      const [chats, total] = await query.skip(skip).take(filters.limit).getManyAndCount();
      
      // Cargar deudores manualmente para chats que tengan debtorId
      for (const chat of chats) {
        if (chat.debtorId) {
          const debtor = await this.debtorRepository.findOne({
            where: { id: chat.debtorId },
          });
          if (debtor) {
            (chat as any).debtor = debtor;
          }
        }
      }

      return {
        data: chats,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      };
    }

    const chats = await query.getMany();
    
    // Cargar deudores manualmente para chats que tengan debtorId
    for (const chat of chats) {
      if (chat.debtorId) {
        const debtor = await this.debtorRepository.findOne({
          where: { id: chat.debtorId },
        });
        if (debtor) {
          (chat as any).debtor = debtor;
        }
      }
    }

    return { data: chats };
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

    // Cargar deudor manualmente si existe debtorId
    if (chat.debtorId) {
      const debtor = await this.debtorRepository.findOne({
        where: { id: chat.debtorId },
      });
      if (debtor) {
        (chat as any).debtor = debtor;
      }
    }

    return chat;
  }

  /**
   * Obtener chat por externalId
   */
  async findByExternalId(externalId: string): Promise<Chat | null> {
    const chat = await this.chatRepository.findOne({
      where: { externalId },
      relations: ['campaign', 'whatsappNumber', 'assignedAgent'],
    });
    
    // Cargar deudor manualmente si existe
    if (chat?.debtorId) {
      const debtor = await this.debtorRepository.findOne({
        where: { id: chat.debtorId },
      });
      if (debtor) {
        (chat as any).debtor = debtor;
      }
    }
    
    return chat;
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
  async assign(chatId: string, agentId: string | null, reason?: string): Promise<Chat> {
    this.logger.log(`🎯 MÉTODO ASSIGN LLAMADO - Chat: ${chatId}, AgentId: ${agentId}, Reason: ${reason}`);
    const chat = await this.findOne(chatId);
    const previousAgentId = chat.assignedAgentId;
    this.logger.log(`📋 Chat encontrado. Estado actual: assignedAgentId=${previousAgentId}`);

    // Si agentId es null o vacío, transferir al bot
    if (!agentId) {
      this.logger.log(`🤖 Transfiriendo chat ${chatId} al bot - CERRANDO CONVERSACIÓN`);
      
      // Decrementar contador del agente anterior si existe
      if (previousAgentId) {
        await this.usersService.decrementChatCount(previousAgentId);
        this.logger.log(`📉 Contador de chats decrementado para agente ${previousAgentId}`);
      }

      // CAMBIO: Cerrar el chat correctamente en lugar de solo cambiar estado a BOT
      // Esto genera el PDF de cierre y marca la conversación como finalizada
      chat.assignedAgentId = null;
      chat.status = ChatStatus.CLOSED;
      chat.closedAt = new Date();
      chat.assignedAt = null;

      await this.chatRepository.save(chat);
      this.logger.log(`✅ Chat ${chatId} cerrado y desasignado del agente ${previousAgentId}`);

      // Emitir evento de cierre para generar PDF y actualizar frontend
      this.eventEmitter.emit('chat.closed', chat);

      // Emitir evento para notificar al frontend que el chat fue desasignado
      if (previousAgentId) {
        this.logger.log(`🔥 EMITIENDO EVENTO chat.unassigned para agente ${previousAgentId}`);
        this.eventEmitter.emit('chat.unassigned', {
          chat: await this.findOne(chatId),
          previousAgentId,
          reason: reason || 'Transferido al bot y cerrado',
        });
      }

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
    const previousAgentId = chat.assignedAgentId;

    if (chat.assignedAgentId) {
      await this.usersService.decrementChatCount(chat.assignedAgentId);
    }

    chat.status = ChatStatus.CLOSED;
    chat.closedAt = new Date();

    await this.chatRepository.save(chat);

    this.logger.log(`Chat ${chatId} cerrado por usuario ${userId}`);

    // Emitir evento de cierre (el listener handleChatClosed enviará el mensaje de despedida)
    this.eventEmitter.emit('chat.closed', chat);

    // Si tenía agente asignado, emitir evento para generar PDF automático
    if (previousAgentId) {
      this.eventEmitter.emit('chat.unassigned', {
        chat: await this.findOne(chatId),
        previousAgentId,
        reason: 'Chat cerrado manualmente',
      });
      this.logger.log(`🎧 Evento chat.unassigned emitido para generar PDF de cierre`);
    }

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

  /**
   * Actualizar información del contacto del chat
   */
  async updateContactInfo(
    chatId: string,
    data: { contactName?: string; contactPhone?: string },
  ): Promise<Chat> {
    const chat = await this.findOne(chatId);

    if (data.contactName) {
      chat.contactName = data.contactName;
    }
    if (data.contactPhone) {
      chat.contactPhone = data.contactPhone;
    }

    await this.chatRepository.save(chat);

    this.logger.log(`Chat ${chatId} - Información de contacto actualizada: ${JSON.stringify(data)}`);

    // También actualizar el cliente asociado si existe
    if (chat.clientId) {
      try {
        const clientRepo = this.chatRepository.manager.getRepository('Client');
        const updateData: Record<string, any> = {};
        
        if (data.contactName) {
          updateData.fullName = data.contactName;
        }
        if (data.contactPhone) {
          updateData.phone = data.contactPhone;
        }

        if (Object.keys(updateData).length > 0) {
          await clientRepo.update(chat.clientId, updateData);
          this.logger.log(`Cliente ${chat.clientId} actualizado con: ${JSON.stringify(updateData)}`);
        }
      } catch (error) {
        this.logger.warn(`No se pudo actualizar el cliente asociado: ${error.message}`);
      }
    }

    // Emitir evento para actualizar en tiempo real
    this.eventEmitter.emit('chat.updated', { chat });

    return chat;
  }

  /**
   * Transferir chat a otra campaña
   */
  async transferToCampaign(chatId: string, newCampaignId: string, userId: string): Promise<Chat> {
    const chat = await this.findOne(chatId);
    const previousCampaignId = chat.campaignId;
    const previousAgentId = chat.assignedAgentId;

    // Verificar que la campaña de destino existe
    const campaignRepo = this.chatRepository.manager.getRepository('Campaign');
    const newCampaign = await campaignRepo.findOne({ where: { id: newCampaignId } });
    
    if (!newCampaign) {
      throw new NotFoundException(`Campaña ${newCampaignId} no encontrada`);
    }

    // Decrementar contador del agente actual si existe
    if (previousAgentId) {
      await this.usersService.decrementChatCount(previousAgentId);
    }

    // Actualizar chat
    chat.campaignId = newCampaignId;
    chat.assignedAgentId = null;
    chat.assignedAt = null;
    chat.status = ChatStatus.WAITING;
    chat.subStatus = 'waiting_for_agent';

    // Guardar nota del cambio en metadata
    const transferNote = {
      type: 'campaign_transfer',
      from: previousCampaignId,
      to: newCampaignId,
      by: userId,
      previousAgent: previousAgentId,
      timestamp: new Date().toISOString(),
    };

    chat.metadata = {
      ...chat.metadata,
      campaignTransfers: [...(chat.metadata?.campaignTransfers || []), transferNote],
    };

    await this.chatRepository.save(chat);

    this.logger.log(`✅ Chat ${chatId} transferido de campaña ${previousCampaignId} a ${newCampaignId} por usuario ${userId}`);

    // Emitir eventos
    if (previousAgentId) {
      this.eventEmitter.emit('chat.unassigned', {
        chat,
        previousAgentId,
        reason: `Transferido a campaña: ${(newCampaign as any).name}`,
      });
    }

    this.eventEmitter.emit('chat.campaign_transferred', {
      chat,
      previousCampaignId,
      newCampaignId,
      userId,
    });

    return chat;
  }

  /**
   * Obtener historial de tickets y agente anterior por teléfono
   * - Busca chats anteriores cerrados del mismo teléfono
   * - Devuelve el último agente que lo atendió y el historial de tickets
   */
  async getClientHistory(phone: string, campaignId?: string): Promise<{
    previousAgent: { id: string; name: string; email: string } | null;
    ticketHistory: Array<{
      ticketNumber: string;
      closedAt: Date;
      typification: string;
      typificationCategory: string;
      agentName: string;
      campaignName: string;
    }>;
    totalChats: number;
    uniqueClient: boolean;
  }> {
    const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Buscar todos los chats cerrados de este teléfono
    const whereCondition: any = {
      contactPhone: normalizedPhone,
      status: ChatStatus.CLOSED,
      closedAt: Not(IsNull()),
    };
    
    if (campaignId) {
      whereCondition.campaignId = campaignId;
    }

    const previousChats = await this.chatRepository.find({
      where: whereCondition,
      relations: ['assignedAgent', 'campaign'],
      order: { closedAt: 'DESC' },
    });

    // Obtener el último agente que atendió este cliente
    let previousAgent = null;
    if (previousChats.length > 0 && previousChats[0].assignedAgent) {
      const agent = previousChats[0].assignedAgent;
      previousAgent = {
        id: agent.id,
        name: agent.fullName,
        email: agent.email,
      };
    }

    // Obtener las evidencias (tickets) de estos chats
    const chatIds = previousChats.map(c => c.id);
    let evidences: any[] = [];
    
    if (chatIds.length > 0) {
      evidences = await this.chatRepository.manager.getRepository('evidences').find({
        where: { chatId: In(chatIds) },
        relations: ['agent', 'chat'],
        order: { createdAt: 'DESC' },
      });
    }

    // Construir historial de tickets
    const ticketHistory = evidences.map(evidence => {
      const chat = previousChats.find(c => c.id === evidence.chatId);
      return {
        ticketNumber: evidence.ticketNumber,
        closedAt: chat?.closedAt || evidence.createdAt,
        typification: evidence.closureType === 'paid' ? 'Pagado' : 
                     evidence.closureType === 'promise' ? 'Promesa de pago' : 
                     evidence.closureType || 'Sin tipificación',
        typificationCategory: chat?.resolutionType || 'Sin categoría',
        agentName: evidence.agent?.fullName || chat?.assignedAgent?.fullName || 'Sin asignar',
        campaignName: chat?.campaign?.name || 'Sin campaña',
      };
    });

    // Contar clientes únicos (para facturación - se considera único si no hay otros chats)
    const uniqueClient = previousChats.length <= 1;

    return {
      previousAgent,
      ticketHistory,
      totalChats: previousChats.length,
      uniqueClient,
    };
  }

  /**
   * Crear chat manual iniciado por un agente
   * - Crea o reutiliza el chat
   * - Asigna al agente que lo creó o al agente especificado (para admin/supervisor)
   * - Estado inicial "pending_first_message" hasta que el cliente responda
   * - Para clientes que regresan, sugiere el agente anterior
   * - Envía template de WhatsApp si se especifica
   */
  async createManualChat(
    phone: string,
    agentId: string,
    contactName?: string,
    campaignId?: string,
    assignToAgentId?: string,
    creatorRole?: string,
    templateSid?: string,
    templateVariables?: Record<string, string>,
  ): Promise<{ 
    chat: Chat; 
    isNew: boolean; 
    canSendMessage: boolean; 
    waitingResponse: boolean;
    templateSent?: boolean;
    previousAgent?: { id: string; name: string; email: string } | null;
    ticketHistory?: Array<{
      ticketNumber: string;
      closedAt: Date;
      typification: string;
      typificationCategory: string;
      agentName: string;
      campaignName: string;
    }>;
  }> {
    this.logger.log(`📱 Creando chat manual - Teléfono: ${phone}, Agente: ${agentId}, AssignTo: ${assignToAgentId || 'auto'}, Template: ${templateSid || 'ninguno'}`);

    // Normalizar teléfono (quitar espacios, guiones, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Si no se especificó campaignId, obtener la campaña del agente
    let resolvedCampaignId = campaignId;
    if (!resolvedCampaignId) {
      const userCampaign = await this.userCampaignRepository.findOne({
        where: { userId: agentId, isActive: true },
        order: { isPrimary: 'DESC', assignedAt: 'ASC' },
      });
      
      if (!userCampaign) {
        throw new BadRequestException('No tiene una campaña asignada. Contacte al administrador.');
      }
      
      resolvedCampaignId = userCampaign.campaignId;
      this.logger.log(`📋 Campaña obtenida del agente: ${resolvedCampaignId}`);
    }
    
    // Obtener historial del cliente
    const clientHistory = await this.getClientHistory(normalizedPhone, resolvedCampaignId);
    this.logger.log(`📊 Historial del cliente: ${clientHistory.totalChats} chats anteriores`);
    
    // Determinar a qué agente asignar
    let targetAgentId = agentId;
    const canAssignToOther = ['superadmin', 'admin', 'supervisor'].includes(creatorRole || '');
    
    if (assignToAgentId && canAssignToOther) {
      // Admin/supervisor especificó un agente
      targetAgentId = assignToAgentId;
      this.logger.log(`👤 Asignando a agente específico: ${assignToAgentId}`);
    } else if (clientHistory.previousAgent && !assignToAgentId) {
      // Cliente que regresa: asignar al mismo agente anterior
      targetAgentId = clientHistory.previousAgent.id;
      this.logger.log(`🔄 Cliente recurrente, asignando al agente anterior: ${clientHistory.previousAgent.name}`);
    }
    
    // Obtener número de WhatsApp de la campaña
    const whatsappNumber = await this.whatsappService.getWhatsappNumberByCampaign(resolvedCampaignId);
    if (!whatsappNumber) {
      throw new BadRequestException('La campaña no tiene un número de WhatsApp asignado');
    }

    // Generar externalId único para este chat
    const externalId = `manual_${normalizedPhone}_${resolvedCampaignId}_${Date.now()}`;
    
    // Verificar si ya existe un chat activo con este teléfono en esta campaña
    const existingChat = await this.chatRepository.findOne({
      where: {
        contactPhone: normalizedPhone,
        campaignId: resolvedCampaignId,
        status: In([ChatStatus.WAITING, ChatStatus.BOT, ChatStatus.ACTIVE, ChatStatus.PENDING]),
      },
      relations: ['campaign', 'whatsappNumber', 'assignedAgent'],
    });

    if (existingChat) {
      this.logger.log(`📋 Chat existente encontrado: ${existingChat.id}`);
      
      // Si ya está asignado a otro agente
      if (existingChat.assignedAgentId && existingChat.assignedAgentId !== targetAgentId) {
        // Solo admin/supervisor puede reasignar
        if (canAssignToOther && assignToAgentId) {
          // Decrementar contador del agente anterior
          await this.usersService.decrementChatCount(existingChat.assignedAgentId);
          // Actualizar asignación
          existingChat.assignedAgentId = targetAgentId;
          existingChat.assignedAt = new Date();
          existingChat.metadata = {
            ...existingChat.metadata,
            reassignedBy: agentId,
            reassignedAt: new Date().toISOString(),
          };
          await this.chatRepository.save(existingChat);
          // Incrementar contador del nuevo agente
          await this.usersService.incrementChatCount(targetAgentId);
          this.logger.log(`🔄 Chat reasignado por ${creatorRole} a: ${targetAgentId}`);
        } else {
          throw new BadRequestException('Este contacto ya tiene un chat activo asignado a otro agente');
        }
      }

      // Si no está asignado, asignarlo al agente objetivo
      if (!existingChat.assignedAgentId) {
        existingChat.assignedAgentId = targetAgentId;
        existingChat.assignedAt = new Date();
        existingChat.status = ChatStatus.ACTIVE;
        await this.chatRepository.save(existingChat);
        await this.usersService.incrementChatCount(targetAgentId);
      }

      // Enviar template en chat existente si se especificó
      let templateSent = false;
      if (templateSid) {
        try {
          this.logger.log(`📤 Enviando template ${templateSid} a chat existente ${existingChat.id}`);
          await this.whatsappService.sendContentTemplate(
            existingChat.whatsappNumberId,
            normalizedPhone,
            templateSid,
            templateVariables,
          );
          templateSent = true;
          existingChat.metadata = {
            ...existingChat.metadata,
            templateSent: true,
            templateSid,
            templateSentAt: new Date().toISOString(),
          };
          await this.chatRepository.save(existingChat);
          this.logger.log(`✅ Template enviado a chat existente`);
        } catch (templateError) {
          this.logger.error(`❌ Error enviando template a chat existente: ${templateError.message}`);
        }
      }

      return {
        chat: existingChat,
        isNew: false,
        canSendMessage: true,
        waitingResponse: existingChat.metadata?.waitingClientResponse || false,
        templateSent,
        previousAgent: clientHistory.previousAgent,
        ticketHistory: clientHistory.ticketHistory,
      };
    }

    // Crear nuevo chat
    const chat = this.chatRepository.create({
      externalId,
      contactPhone: normalizedPhone,
      contactName: contactName || `+${normalizedPhone}`,
      campaignId: resolvedCampaignId,
      whatsappNumberId: whatsappNumber.id,
      assignedAgentId: targetAgentId,
      assignedAt: new Date(),
      status: ChatStatus.ACTIVE,
      metadata: {
        createdManually: true,
        createdBy: agentId,
        createdAt: new Date().toISOString(),
        waitingClientResponse: true, // Esperando respuesta del cliente
        messagesWithoutResponse: 0, // Contador de mensajes sin respuesta
        isReturningClient: clientHistory.totalChats > 0,
        previousChatsCount: clientHistory.totalChats,
        assignedByRole: creatorRole,
      },
    });

    const savedChat = await this.chatRepository.save(chat);
    
    // Incrementar contador de chats del agente objetivo
    await this.usersService.incrementChatCount(targetAgentId);

    // Cargar relaciones
    const fullChat = await this.chatRepository.findOne({
      where: { id: savedChat.id },
      relations: ['campaign', 'whatsappNumber', 'assignedAgent'],
    });

    this.logger.log(`✅ Chat manual creado: ${savedChat.id}, asignado a: ${targetAgentId}`);

    // Emitir evento de chat creado
    this.eventEmitter.emit('chat.created', fullChat);

    // Enviar template si se especificó
    let templateSent = false;
    if (templateSid && fullChat) {
      try {
        this.logger.log(`📤 Enviando template ${templateSid} a ${normalizedPhone}`);
        await this.whatsappService.sendContentTemplate(
          whatsappNumber.id,
          normalizedPhone,
          templateSid,
          templateVariables,
        );
        templateSent = true;
        this.logger.log(`✅ Template enviado exitosamente a ${normalizedPhone}`);
        
        // Actualizar metadata para indicar que se envió template
        fullChat.metadata = {
          ...fullChat.metadata,
          templateSent: true,
          templateSid,
          templateSentAt: new Date().toISOString(),
        };
        await this.chatRepository.save(fullChat);
      } catch (templateError) {
        this.logger.error(`❌ Error enviando template: ${templateError.message}`);
        // No fallar la creación del chat si el template falla
      }
    }

    return {
      chat: fullChat!,
      isNew: true,
      canSendMessage: true,
      waitingResponse: true,
      templateSent,
      previousAgent: clientHistory.previousAgent,
      ticketHistory: clientHistory.ticketHistory,
    };
  }

  /**
   * Registrar envío de mensaje en chat manual (para control de límite diario)
   */
  async recordManualMessageSent(chatId: string): Promise<{ canSendMore: boolean; messagesCount: number }> {
    const chat = await this.findOne(chatId);
    
    const messagesWithoutResponse = (chat.metadata?.messagesWithoutResponse || 0) + 1;
    const maxMessagesWithoutResponse = 1; // Límite: 1 mensaje sin respuesta
    
    chat.metadata = {
      ...chat.metadata,
      messagesWithoutResponse,
      lastMessageSentAt: new Date().toISOString(),
      waitingClientResponse: true,
    };

    await this.chatRepository.save(chat);

    return {
      canSendMore: messagesWithoutResponse < maxMessagesWithoutResponse,
      messagesCount: messagesWithoutResponse,
    };
  }

  /**
   * Activar chat cuando el cliente responde
   */
  async activateOnClientResponse(chatId: string): Promise<Chat> {
    const chat = await this.findOne(chatId);
    
    if (chat.metadata?.createdManually && chat.metadata?.waitingClientResponse) {
      chat.metadata = {
        ...chat.metadata,
        waitingClientResponse: false,
        messagesWithoutResponse: 0,
        clientRespondedAt: new Date().toISOString(),
      };
      chat.status = ChatStatus.ACTIVE;
      
      await this.chatRepository.save(chat);
      this.logger.log(`✅ Chat ${chatId} activado por respuesta del cliente`);
    }

    return chat;
  }

  /**
   * Verificar si se puede enviar mensaje en chat manual
   */
  async canSendManualMessage(chatId: string): Promise<{ canSend: boolean; reason?: string }> {
    const chat = await this.findOne(chatId);
    
    // Si no es chat manual, siempre puede enviar
    if (!chat.metadata?.createdManually) {
      return { canSend: true };
    }

    // Si el cliente ya respondió, puede enviar
    if (!chat.metadata?.waitingClientResponse) {
      return { canSend: true };
    }

    // Si ya envió mensaje y el cliente no ha respondido, no puede enviar más
    const messagesWithoutResponse = chat.metadata?.messagesWithoutResponse || 0;
    if (messagesWithoutResponse >= 1) {
      return {
        canSend: false,
        reason: 'Ya se envió un mensaje y el cliente aún no ha respondido. Debe esperar la respuesta del cliente para continuar.',
      };
    }

    return { canSend: true };
  }
}
