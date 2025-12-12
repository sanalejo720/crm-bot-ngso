"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const chat_entity_1 = require("./entities/chat.entity");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/entities/user.entity");
const debtor_entity_1 = require("../debtors/entities/debtor.entity");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let ChatsService = ChatsService_1 = class ChatsService {
    constructor(chatRepository, debtorRepository, usersService, eventEmitter, whatsappService) {
        this.chatRepository = chatRepository;
        this.debtorRepository = debtorRepository;
        this.usersService = usersService;
        this.eventEmitter = eventEmitter;
        this.whatsappService = whatsappService;
        this.logger = new common_1.Logger(ChatsService_1.name);
    }
    async create(createChatDto) {
        const existing = await this.chatRepository.findOne({
            where: { externalId: createChatDto.externalId },
        });
        if (existing) {
            this.logger.warn(`Chat con externalId ${createChatDto.externalId} ya existe`);
            return existing;
        }
        const chat = this.chatRepository.create({
            ...createChatDto,
            status: chat_entity_1.ChatStatus.WAITING,
        });
        const savedChat = await this.chatRepository.save(chat);
        this.logger.log(`Chat creado: ${savedChat.id} - ${savedChat.contactPhone}`);
        const chatWithCampaign = await this.chatRepository.findOne({
            where: { id: savedChat.id },
            relations: ['campaign'],
        });
        this.eventEmitter.emit('chat.created', chatWithCampaign);
        return savedChat;
    }
    async findAll(filters) {
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
        const chats = await query.getMany();
        for (const chat of chats) {
            if (chat.debtorId) {
                const debtor = await this.debtorRepository.findOne({
                    where: { id: chat.debtorId },
                });
                if (debtor) {
                    chat.debtor = debtor;
                }
            }
        }
        return chats;
    }
    async findOne(id) {
        const chat = await this.chatRepository.findOne({
            where: { id },
            relations: ['campaign', 'whatsappNumber', 'assignedAgent', 'client', 'messages'],
        });
        if (!chat) {
            throw new common_1.NotFoundException(`Chat con ID ${id} no encontrado`);
        }
        if (chat.debtorId) {
            const debtor = await this.debtorRepository.findOne({
                where: { id: chat.debtorId },
            });
            if (debtor) {
                chat.debtor = debtor;
            }
        }
        return chat;
    }
    async findByExternalId(externalId) {
        const chat = await this.chatRepository.findOne({
            where: { externalId },
            relations: ['campaign', 'whatsappNumber', 'assignedAgent'],
        });
        if (chat?.debtorId) {
            const debtor = await this.debtorRepository.findOne({
                where: { id: chat.debtorId },
            });
            if (debtor) {
                chat.debtor = debtor;
            }
        }
        return chat;
    }
    async update(id, updateChatDto) {
        const chat = await this.findOne(id);
        Object.assign(chat, updateChatDto);
        const updatedChat = await this.chatRepository.save(chat);
        this.logger.log(`Chat actualizado: ${updatedChat.id}`);
        this.eventEmitter.emit('chat.updated', updatedChat);
        return updatedChat;
    }
    async assign(chatId, agentId, reason) {
        this.logger.log(`🎯 MÉTODO ASSIGN LLAMADO - Chat: ${chatId}, AgentId: ${agentId}, Reason: ${reason}`);
        const chat = await this.findOne(chatId);
        const previousAgentId = chat.assignedAgentId;
        this.logger.log(`📋 Chat encontrado. Estado actual: assignedAgentId=${previousAgentId}`);
        if (!agentId) {
            this.logger.log(`🤖 Transfiriendo chat ${chatId} al bot - CERRANDO CONVERSACIÓN`);
            if (previousAgentId) {
                await this.usersService.decrementChatCount(previousAgentId);
                this.logger.log(`📉 Contador de chats decrementado para agente ${previousAgentId}`);
            }
            chat.assignedAgentId = null;
            chat.status = chat_entity_1.ChatStatus.CLOSED;
            chat.closedAt = new Date();
            chat.assignedAt = null;
            await this.chatRepository.save(chat);
            this.logger.log(`✅ Chat ${chatId} cerrado y desasignado del agente ${previousAgentId}`);
            this.eventEmitter.emit('chat.closed', chat);
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
        const agent = await this.usersService.findOne(agentId);
        this.logger.log(`👤 Agente encontrado: ${agent.fullName} - Estado: ${agent.agentState} - Chats: ${agent.currentChatsCount}/${agent.maxConcurrentChats}`);
        if (agent.agentState !== user_entity_1.AgentState.AVAILABLE) {
            this.logger.error(`❌ VALIDACIÓN FALLIDA: Agente ${agent.fullName} NO está disponible (estado: ${agent.agentState})`);
            throw new common_1.BadRequestException('El agente no está disponible');
        }
        if (agent.currentChatsCount >= agent.maxConcurrentChats) {
            this.logger.error(`❌ VALIDACIÓN FALLIDA: Agente ${agent.fullName} alcanzó límite ${agent.currentChatsCount}/${agent.maxConcurrentChats}`);
            throw new common_1.BadRequestException('El agente alcanzó su límite de chats concurrentes');
        }
        if (previousAgentId && previousAgentId !== agentId) {
            await this.usersService.decrementChatCount(previousAgentId);
        }
        chat.assignedAgentId = agentId;
        chat.status = chat_entity_1.ChatStatus.ACTIVE;
        chat.assignedAt = new Date();
        await this.chatRepository.save(chat);
        if (previousAgentId !== agentId) {
            await this.usersService.incrementChatCount(agentId);
        }
        this.logger.log(`Chat ${chatId} asignado al agente ${agentId}`);
        this.logger.log(`🔥 EMITIENDO EVENTO chat.assigned para agente ${agent.fullName} (${agent.id})`);
        this.eventEmitter.emit('chat.assigned', {
            chat: await this.findOne(chatId),
            agentId: agent.id,
            agentName: agent.fullName,
        });
        this.logger.log(`🔥 EVENTO EMITIDO correctamente`);
        return this.findOne(chatId);
    }
    async transfer(chatId, currentAgentId, newAgentId, reason) {
        const chat = await this.findOne(chatId);
        const newAgent = await this.usersService.findOne(newAgentId);
        if (chat.assignedAgentId !== currentAgentId) {
            throw new common_1.BadRequestException('No tienes permiso para transferir este chat');
        }
        if (newAgent.currentChatsCount >= newAgent.maxConcurrentChats) {
            throw new common_1.BadRequestException('El nuevo agente alcanzó su límite de chats');
        }
        await this.usersService.decrementChatCount(currentAgentId);
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
        await this.usersService.incrementChatCount(newAgentId);
        this.logger.log(`Chat ${chatId} transferido de ${currentAgentId} a ${newAgentId}`);
        this.eventEmitter.emit('chat.transferred', {
            chat,
            fromAgent: currentAgentId,
            toAgent: newAgentId,
            reason,
        });
        return this.findOne(chatId);
    }
    async close(chatId, userId) {
        const chat = await this.findOne(chatId);
        const previousAgentId = chat.assignedAgentId;
        if (chat.assignedAgentId) {
            await this.usersService.decrementChatCount(chat.assignedAgentId);
        }
        chat.status = chat_entity_1.ChatStatus.CLOSED;
        chat.closedAt = new Date();
        await this.chatRepository.save(chat);
        this.logger.log(`Chat ${chatId} cerrado por usuario ${userId}`);
        this.eventEmitter.emit('chat.closed', chat);
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
    async resolve(chatId, userId) {
        const chat = await this.findOne(chatId);
        chat.status = chat_entity_1.ChatStatus.RESOLVED;
        chat.resolvedAt = new Date();
        await this.chatRepository.save(chat);
        this.logger.log(`Chat ${chatId} resuelto por usuario ${userId}`);
        this.eventEmitter.emit('chat.resolved', chat);
        return chat;
    }
    async getWaitingChats(campaignId) {
        return this.chatRepository.find({
            where: {
                campaignId,
                status: chat_entity_1.ChatStatus.WAITING,
            },
            order: {
                priority: 'DESC',
                createdAt: 'ASC',
            },
        });
    }
    async updateLastActivity(chatId, messageText) {
        await this.chatRepository.update(chatId, {
            lastMessageText: messageText.substring(0, 255),
            lastMessageAt: new Date(),
        });
    }
    async incrementUnreadCount(chatId) {
        await this.chatRepository.increment({ id: chatId }, 'unreadCount', 1);
    }
    async resetUnreadCount(chatId) {
        await this.chatRepository.update(chatId, { unreadCount: 0 });
    }
    async getAgentStats(agentId) {
        const [active, resolved, total] = await Promise.all([
            this.chatRepository.count({
                where: { assignedAgentId: agentId, status: chat_entity_1.ChatStatus.ACTIVE },
            }),
            this.chatRepository.count({
                where: { assignedAgentId: agentId, status: chat_entity_1.ChatStatus.RESOLVED },
            }),
            this.chatRepository.count({ where: { assignedAgentId: agentId } }),
        ]);
        return { active, resolved, total };
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = ChatsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(debtor_entity_1.Debtor)),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsappService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        event_emitter_1.EventEmitter2,
        whatsapp_service_1.WhatsappService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map