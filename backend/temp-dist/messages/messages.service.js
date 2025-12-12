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
var MessagesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const message_entity_1 = require("./entities/message.entity");
const chats_service_1 = require("../chats/chats.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const clients_service_1 = require("../clients/clients.service");
const debtors_service_1 = require("../debtors/debtors.service");
const whatsapp_number_entity_1 = require("../whatsapp/entities/whatsapp-number.entity");
const client_entity_1 = require("../clients/entities/client.entity");
const collection_status_enum_1 = require("../clients/enums/collection-status.enum");
let MessagesService = MessagesService_1 = class MessagesService {
    constructor(messageRepository, whatsappNumberRepository, clientRepository, chatsService, whatsappService, clientsService, debtorsService, eventEmitter) {
        this.messageRepository = messageRepository;
        this.whatsappNumberRepository = whatsappNumberRepository;
        this.clientRepository = clientRepository;
        this.chatsService = chatsService;
        this.whatsappService = whatsappService;
        this.clientsService = clientsService;
        this.debtorsService = debtorsService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(MessagesService_1.name);
    }
    /**
     * Crear nuevo mensaje
     */
    async create(createMessageDto) {
        const chat = await this.chatsService.findOne(createMessageDto.chatId);
        const message = this.messageRepository.create({
            ...createMessageDto,
            status: message_entity_1.MessageStatus.PENDING,
        });
        const savedMessage = await this.messageRepository.save(message);
        // Actualizar última actividad del chat
        if (createMessageDto.content) {
            await this.chatsService.updateLastActivity(chat.id, createMessageDto.content);
        }
        // Si es mensaje entrante, incrementar contador no leído
        if (createMessageDto.direction === message_entity_1.MessageDirection.INBOUND) {
            await this.chatsService.incrementUnreadCount(chat.id);
        }
        this.logger.log(`Mensaje creado: ${savedMessage.id} en chat ${chat.id}`);
        // Emitir evento con el formato que esperan los listeners
        this.eventEmitter.emit('message.created', {
            message: savedMessage,
            chat: chat,
        });
        return savedMessage;
    }
    /**
     * Obtener mensajes de un chat
     */
    async findByChatId(chatId, options) {
        const query = this.messageRepository
            .createQueryBuilder('message')
            .where('message.chatId = :chatId', { chatId })
            .leftJoinAndSelect('message.sender', 'sender')
            .orderBy('message.createdAt', 'ASC');
        if (options?.limit) {
            query.take(options.limit);
        }
        if (options?.offset) {
            query.skip(options.offset);
        }
        return query.getMany();
    }
    /**
     * Obtener mensaje por ID
     */
    async findOne(id) {
        const message = await this.messageRepository.findOne({
            where: { id },
            relations: ['chat', 'sender'],
        });
        if (!message) {
            throw new common_1.NotFoundException(`Mensaje con ID ${id} no encontrado`);
        }
        return message;
    }
    /**
     * Obtener mensaje por externalId
     */
    async findByExternalId(externalId) {
        return this.messageRepository.findOne({
            where: { externalId },
        });
    }
    /**
     * Enviar mensaje de texto a través de WhatsApp
     */
    async sendTextMessage(chatId, senderId, content) {
        const chat = await this.chatsService.findOne(chatId);
        if (!chat.whatsappNumber) {
            throw new common_1.BadRequestException('Chat no tiene número WhatsApp asociado');
        }
        try {
            // Enviar a través del servicio WhatsApp
            const result = await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, content, message_entity_1.MessageType.TEXT);
            // Crear registro del mensaje
            const message = await this.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.AGENT,
                content,
                externalId: result.messageId,
                senderId,
                metadata: result.metadata,
            });
            // Actualizar estado a enviado
            await this.updateStatus(message.id, message_entity_1.MessageStatus.SENT);
            return message;
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje: ${error.message}`, error.stack);
            // Crear mensaje con estado fallido
            const message = await this.create({
                chatId,
                type: message_entity_1.MessageType.TEXT,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.AGENT,
                content,
                senderId,
            });
            await this.updateStatus(message.id, message_entity_1.MessageStatus.FAILED, error.message);
            throw error;
        }
    }
    /**
     * Enviar mensaje con media (imagen, audio, video, documento)
     */
    async sendMediaMessage(chatId, senderId, mediaUrl, mediaType, caption) {
        const chat = await this.chatsService.findOne(chatId);
        if (!chat.whatsappNumber) {
            throw new common_1.BadRequestException('Chat no tiene número WhatsApp asociado');
        }
        try {
            const result = await this.whatsappService.sendMessage(chat.whatsappNumber.id, chat.contactPhone, caption || '', mediaType, mediaUrl);
            const message = await this.create({
                chatId,
                type: mediaType,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.AGENT,
                content: caption,
                mediaUrl,
                externalId: result.messageId,
                senderId,
                metadata: result.metadata,
            });
            await this.updateStatus(message.id, message_entity_1.MessageStatus.SENT);
            return message;
        }
        catch (error) {
            this.logger.error(`Error enviando media: ${error.message}`, error.stack);
            const message = await this.create({
                chatId,
                type: mediaType,
                direction: message_entity_1.MessageDirection.OUTBOUND,
                senderType: message_entity_1.MessageSenderType.AGENT,
                content: caption,
                mediaUrl,
                senderId,
            });
            await this.updateStatus(message.id, message_entity_1.MessageStatus.FAILED, error.message);
            throw error;
        }
    }
    /**
     * Procesar mensaje entrante desde WhatsApp
     */
    async processIncomingMessage(data) {
        // Buscar o crear chat
        let chat = await this.chatsService.findByExternalId(`wa-${data.whatsappNumberId}-${data.contactPhone}`);
        if (!chat) {
            // Obtener campaignId desde el número de WhatsApp
            // Por simplicidad, asumimos que está disponible
            const whatsappNumber = await this.whatsappService.findOne(data.whatsappNumberId);
            chat = await this.chatsService.create({
                externalId: `wa-${data.whatsappNumberId}-${data.contactPhone}`,
                contactPhone: data.contactPhone,
                contactName: data.contactName,
                campaignId: whatsappNumber.campaignId,
                whatsappNumberId: data.whatsappNumberId,
            });
            // Asociar automáticamente con deudor si existe
            await this.associateDebtorToClient(chat);
        }
        // Crear mensaje
        const message = await this.create({
            chatId: chat.id,
            externalId: data.externalId,
            type: data.type,
            direction: message_entity_1.MessageDirection.INBOUND,
            senderType: message_entity_1.MessageSenderType.CONTACT,
            content: data.content,
            mediaUrl: data.mediaUrl,
            mediaFileName: data.mediaFileName,
            mediaMimeType: data.mediaMimeType,
            metadata: { timestamp: data.timestamp },
        });
        await this.updateStatus(message.id, message_entity_1.MessageStatus.DELIVERED);
        this.logger.log(`Mensaje entrante procesado: ${message.id} de ${data.contactPhone}`);
        return message;
    }
    /**
     * Actualizar estado del mensaje
     */
    async updateStatus(id, status, errorMessage) {
        const updateData = { status };
        if (status === message_entity_1.MessageStatus.SENT) {
            updateData.sentAt = new Date();
        }
        else if (status === message_entity_1.MessageStatus.DELIVERED) {
            updateData.deliveredAt = new Date();
        }
        else if (status === message_entity_1.MessageStatus.READ) {
            updateData.readAt = new Date();
        }
        else if (status === message_entity_1.MessageStatus.FAILED) {
            updateData.errorMessage = errorMessage;
        }
        await this.messageRepository.update(id, updateData);
        // Emitir evento de cambio de estado
        this.eventEmitter.emit('message.status.updated', { id, status });
    }
    /**
     * Marcar mensajes como leídos
     */
    async markAsRead(chatId) {
        await this.messageRepository
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({
            status: message_entity_1.MessageStatus.READ,
            readAt: new Date(),
        })
            .where('chatId = :chatId', { chatId })
            .andWhere('direction = :direction', { direction: message_entity_1.MessageDirection.INBOUND })
            .andWhere('status != :status', { status: message_entity_1.MessageStatus.READ })
            .execute();
        // Resetear contador no leído del chat
        await this.chatsService.resetUnreadCount(chatId);
        this.logger.log(`Mensajes marcados como leídos en chat ${chatId}`);
    }
    /**
     * Obtener estadísticas de mensajes
     */
    async getStats(chatId) {
        const [total, sent, delivered, read, failed] = await Promise.all([
            this.messageRepository.count({ where: { chatId } }),
            this.messageRepository.count({
                where: { chatId, status: message_entity_1.MessageStatus.SENT },
            }),
            this.messageRepository.count({
                where: { chatId, status: message_entity_1.MessageStatus.DELIVERED },
            }),
            this.messageRepository.count({
                where: { chatId, status: message_entity_1.MessageStatus.READ },
            }),
            this.messageRepository.count({
                where: { chatId, status: message_entity_1.MessageStatus.FAILED },
            }),
        ]);
        return { total, sent, delivered, read, failed };
    }
    /**
     * Listener: Procesar mensajes entrantes de WhatsApp
     */
    async handleIncomingWhatsAppMessage(data) {
        try {
            this.logger.log(`📨 Mensaje entrante de WhatsApp: ${data.from} - "${data.content}"`);
            // 1. Buscar el número de WhatsApp por sessionName
            const whatsappNumber = await this.whatsappNumberRepository.findOne({
                where: { sessionName: data.sessionName },
                relations: ['campaign'],
            });
            if (!whatsappNumber) {
                this.logger.warn(`❌ Número de WhatsApp no encontrado para sessionName: ${data.sessionName}`);
                return;
            }
            this.logger.log(`✅ Número WhatsApp encontrado: ${whatsappNumber.displayName} - Campaña: ${whatsappNumber.campaign?.name}`);
            // 2. Buscar o crear cliente
            let client = await this.clientRepository.findOne({
                where: { phone: data.from },
            });
            if (!client) {
                this.logger.log(`📝 Creando nuevo cliente: ${data.from}`);
                client = this.clientRepository.create({
                    phone: data.from,
                    fullName: data.from, // Temporal, se actualizará después
                    status: client_entity_1.ClientStatus.LEAD, // Nuevo cliente entrante es un lead
                });
                client = await this.clientRepository.save(client);
            }
            // 3. Buscar chat existente por externalId o crear uno nuevo
            const existingChats = await this.chatsService.findAll({
                campaignId: whatsappNumber.campaignId,
            });
            let chat = existingChats.find(c => c.contactPhone === data.from &&
                (c.status === 'waiting' || c.status === 'bot' || c.status === 'active' || c.status === 'pending'));
            if (!chat) {
                this.logger.log(`💬 Creando nuevo chat para ${data.from}`);
                chat = await this.chatsService.create({
                    contactName: client.fullName,
                    contactPhone: data.from,
                    externalId: `wpp_${data.from}_${Date.now()}`,
                    campaignId: whatsappNumber.campaignId,
                    whatsappNumberId: whatsappNumber.id,
                });
                // Asociar el cliente al chat después de crearlo
                chat.clientId = client.id;
                await this.chatsService.update(chat.id, { clientId: client.id });
            }
            this.logger.log(`✅ Chat encontrado/creado: ${chat.id}`);
            // 4. Determinar tipo de mensaje
            let messageType = message_entity_1.MessageType.TEXT;
            if (data.type === 'image') {
                messageType = message_entity_1.MessageType.IMAGE;
            }
            else if (data.type === 'audio' || data.type === 'ptt') {
                messageType = message_entity_1.MessageType.AUDIO;
            }
            else if (data.type === 'video') {
                messageType = message_entity_1.MessageType.VIDEO;
            }
            else if (data.type === 'document') {
                messageType = message_entity_1.MessageType.DOCUMENT;
            }
            this.logger.log(`💬 Guardando mensaje tipo: ${messageType}`);
            // 5. Guardar el mensaje
            const message = this.messageRepository.create({
                chatId: chat.id,
                content: data.content,
                type: messageType,
                direction: message_entity_1.MessageDirection.INBOUND,
                senderType: message_entity_1.MessageSenderType.CONTACT,
                status: message_entity_1.MessageStatus.DELIVERED,
                externalId: data.messageId,
                // Guardar datos de multimedia
                mediaUrl: data.mediaUrl || null,
                mediaFileName: data.fileName || null,
                mediaMimeType: data.mimeType || null,
            });
            const savedMessage = await this.messageRepository.save(message);
            this.logger.log(`✅ Mensaje guardado: ${savedMessage.id} - Tipo: ${messageType}`);
            // 6. Actualizar última actividad del chat
            await this.chatsService.updateLastActivity(chat.id, data.content);
            // 7. Emitir evento para Socket.IO y Bot
            this.eventEmitter.emit('message.created', {
                message: savedMessage,
                chat,
            });
            this.logger.log(`🚀 Evento message.created emitido correctamente`);
        }
        catch (error) {
            this.logger.error(`❌ Error procesando mensaje entrante de WhatsApp: ${error.message}`, error.stack);
        }
    }
    /**
     * Busca deudor por teléfono y crea/actualiza cliente asociado al chat
     */
    async associateDebtorToClient(chat) {
        try {
            // Normalizar teléfono del chat (remover @c.us, @g.us, etc.)
            const normalizedPhone = chat.contactPhone.replace(/@c\.us|@g\.us|@s\.whatsapp\.net/g, '');
            this.logger.log(`🔍 Buscando deudor para teléfono: ${normalizedPhone}`);
            // Buscar deudor en la base de datos
            const debtor = await this.debtorsService.findByPhone(normalizedPhone);
            if (!debtor) {
                this.logger.log(`ℹ️ No se encontró deudor para el teléfono ${normalizedPhone}`);
                return;
            }
            this.logger.log(`✅ Deudor encontrado: ${debtor.fullName} - Deuda: $${debtor.debtAmount}`);
            // Buscar si ya existe un cliente con este teléfono
            let client = await this.clientsService.findByPhone(normalizedPhone);
            if (!client) {
                // Separar nombre completo en firstName y lastName
                const nameParts = debtor.fullName.split(' ');
                const firstName = nameParts[0] || debtor.fullName;
                const lastName = nameParts.slice(1).join(' ') || '';
                // Crear nuevo cliente con datos del deudor
                // Mapear status del deudor a CollectionStatus
                let collectionStatus = collection_status_enum_1.CollectionStatus.PENDING;
                if (debtor.status === 'contacted') {
                    collectionStatus = collection_status_enum_1.CollectionStatus.CONTACTED;
                }
                else if (debtor.status === 'promise') {
                    collectionStatus = collection_status_enum_1.CollectionStatus.PROMISE;
                }
                else if (debtor.status === 'paid') {
                    collectionStatus = collection_status_enum_1.CollectionStatus.PAID;
                }
                else if (debtor.status === 'legal') {
                    collectionStatus = collection_status_enum_1.CollectionStatus.LEGAL;
                }
                client = await this.clientsService.create({
                    phone: normalizedPhone,
                    firstName,
                    lastName,
                    email: debtor.email || undefined,
                    company: debtor.metadata?.producto || undefined,
                    campaignId: chat.campaignId,
                    tags: ['deudor', debtor.status],
                    // Campos de deuda directos en la entidad
                    debtAmount: debtor.debtAmount,
                    daysOverdue: debtor.daysOverdue,
                    documentNumber: debtor.documentNumber,
                    collectionStatus,
                    // Metadata adicional
                    customFields: {
                        debtorId: debtor.id,
                        documentType: debtor.documentType,
                        producto: debtor.metadata?.producto,
                        originalData: debtor.metadata,
                    },
                });
                this.logger.log(`✅ Cliente creado: ${client.id} - ${debtor.fullName} - Deuda: $${debtor.debtAmount}`);
            }
            else {
                this.logger.log(`ℹ️ Cliente ya existía: ${client.id}`);
            }
            // Asociar cliente con el chat
            await this.chatsService.update(chat.id, { clientId: client.id });
            this.logger.log(`✅ Chat ${chat.id} asociado al cliente ${client.id}`);
        }
        catch (error) {
            this.logger.error(`❌ Error asociando deudor con cliente: ${error.message}`, error.stack);
        }
    }
};
exports.MessagesService = MessagesService;
__decorate([
    (0, event_emitter_1.OnEvent)('whatsapp.message.received'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagesService.prototype, "handleIncomingWhatsAppMessage", null);
exports.MessagesService = MessagesService = MessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_number_entity_1.WhatsappNumber)),
    __param(2, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        chats_service_1.ChatsService,
        whatsapp_service_1.WhatsappService,
        clients_service_1.ClientsService,
        debtors_service_1.DebtorsService,
        event_emitter_1.EventEmitter2])
], MessagesService);
