import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  Message,
  MessageType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
} from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatsService } from '../chats/chats.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ClientsService } from '../clients/clients.service';
import { DebtorsService } from '../debtors/debtors.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { WhatsappNumber } from '../whatsapp/entities/whatsapp-number.entity';
import { Client, ClientStatus } from '../clients/entities/client.entity';
import { CollectionStatus } from '../clients/enums/collection-status.enum';
import { normalizeWhatsAppPhone } from '../../common/utils/phone.utils';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(WhatsappNumber)
    private whatsappNumberRepository: Repository<WhatsappNumber>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private chatsService: ChatsService,
    private whatsappService: WhatsappService,
    private clientsService: ClientsService,
    private debtorsService: DebtorsService,
    @Inject(forwardRef(() => CampaignsService))
    private campaignsService: CampaignsService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nuevo mensaje
   */
  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const chat = await this.chatsService.findOne(createMessageDto.chatId);

    const message = this.messageRepository.create({
      ...createMessageDto,
      status: MessageStatus.PENDING,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Actualizar última actividad del chat
    if (createMessageDto.content) {
      await this.chatsService.updateLastActivity(
        chat.id,
        createMessageDto.content,
      );
    }

    // Si es mensaje entrante, incrementar contador no leído
    if (createMessageDto.direction === MessageDirection.INBOUND) {
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
  async findByChatId(
    chatId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<Message[]> {
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
  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['chat', 'sender'],
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${id} no encontrado`);
    }

    return message;
  }

  /**
   * Obtener mensaje por externalId
   */
  async findByExternalId(externalId: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { externalId },
    });
  }

  /**
   * Enviar mensaje de texto a través de WhatsApp
   */
  async sendTextMessage(
    chatId: string,
    senderId: string,
    content: string,
  ): Promise<Message> {
    const chat = await this.chatsService.findOne(chatId);

    if (!chat.whatsappNumber) {
      throw new BadRequestException('Chat no tiene número WhatsApp asociado');
    }

    // Verificar límite de mensajes para chats manuales
    if (chat.metadata?.createdManually && chat.metadata?.waitingClientResponse) {
      const canSend = await this.chatsService.canSendManualMessage(chatId);
      if (!canSend.canSend) {
        throw new BadRequestException(canSend.reason || 'No puede enviar más mensajes hasta que el cliente responda');
      }
    }

    // Si senderId no es un UUID válido (ej: 'system'), usar null
    const validSenderId = senderId && senderId !== 'system' && senderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? senderId : null;
    const senderType = validSenderId ? MessageSenderType.AGENT : MessageSenderType.SYSTEM;

    try {
      // Determinar el destinatario: usar whatsappChatId si existe (para @lid), sino contactPhone
      const recipient = chat.metadata?.whatsappChatId || chat.contactPhone;
      this.logger.log(`📤 Enviando mensaje a: ${recipient} (whatsappChatId: ${chat.metadata?.whatsappChatId || 'N/A'})`);
      
      // Enviar a través del servicio WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        recipient,
        content,
        MessageType.TEXT,
      );

      // Crear registro del mensaje
      const message = await this.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType,
        content,
        externalId: result.messageId,
        senderId: validSenderId,
        metadata: result.metadata,
      });

      // Actualizar estado a enviado
      await this.updateStatus(message.id, MessageStatus.SENT);

      // Registrar mensaje enviado en chat manual (para control de límite)
      if (chat.metadata?.createdManually && chat.metadata?.waitingClientResponse) {
        await this.chatsService.recordManualMessageSent(chatId);
      }

      return message;
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`, error.stack);

      // Crear mensaje con estado fallido
      const message = await this.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType,
        content,
        senderId: validSenderId,
      });

      await this.updateStatus(message.id, MessageStatus.FAILED, error.message);

      throw error;
    }
  }

  /**
   * Enviar mensaje con media (imagen, audio, video, documento)
   */
  async sendMediaMessage(
    chatId: string,
    senderId: string,
    mediaUrl: string,
    mediaType: MessageType,
    caption?: string,
  ): Promise<Message> {
    const chat = await this.chatsService.findOne(chatId);

    if (!chat.whatsappNumber) {
      throw new BadRequestException('Chat no tiene número WhatsApp asociado');
    }

    try {
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        caption || '',
        mediaType,
        mediaUrl,
      );

      const message = await this.create({
        chatId,
        type: mediaType,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.AGENT,
        content: caption,
        mediaUrl,
        externalId: result.messageId,
        senderId,
        metadata: result.metadata,
      });

      await this.updateStatus(message.id, MessageStatus.SENT);

      return message;
    } catch (error) {
      this.logger.error(`Error enviando media: ${error.message}`, error.stack);

      const message = await this.create({
        chatId,
        type: mediaType,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.AGENT,
        content: caption,
        mediaUrl,
        senderId,
      });

      await this.updateStatus(message.id, MessageStatus.FAILED, error.message);

      throw error;
    }
  }

  /**
   * Procesar mensaje entrante desde WhatsApp
   */
  async processIncomingMessage(data: {
    externalId: string;
    whatsappNumberId: string;
    contactPhone: string;
    contactName?: string;
    type: MessageType;
    content?: string;
    mediaUrl?: string;
    mediaFileName?: string;
    mediaMimeType?: string;
    timestamp: number;
  }): Promise<Message> {
    // Buscar o crear chat
    let chat = await this.chatsService.findByExternalId(
      `wa-${data.whatsappNumberId}-${data.contactPhone}`,
    );

    if (!chat) {
      // Obtener campaignId desde el número de WhatsApp
      const whatsappNumber = await this.whatsappService.findOne(
        data.whatsappNumberId,
      );

      // Buscar asignación pendiente para este teléfono
      const agentEmail = await this.campaignsService.findPendingAssignment(data.contactPhone);
      
      // Si hay agentEmail, buscar el usuario correspondiente
      let assignedToUserId: string | undefined;
      if (agentEmail) {
        try {
          // Aquí podrías buscar el usuario por email
          // const user = await this.usersService.findByEmail(agentEmail);
          // assignedToUserId = user?.id;
          // Por ahora dejamos que se asigne después manualmente
          this.logger.log(`📧 Se encontró agentEmail: ${agentEmail}, se asignará cuando el agente lo vea`);
        } catch (error) {
          this.logger.warn(`No se pudo encontrar usuario con email ${agentEmail}`);
        }
      }

      chat = await this.chatsService.create({
        externalId: `wa-${data.whatsappNumberId}-${data.contactPhone}`,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        campaignId: whatsappNumber.campaignId,
        whatsappNumberId: data.whatsappNumberId,
        assignedToUserId,
      });

      // Si hay agentEmail, marcar la asignación como completada
      if (agentEmail) {
        await this.campaignsService.markAssignmentAsCompleted(data.contactPhone, agentEmail);
        this.logger.log(`🎯 Chat ${chat.id} preparado para asignación a ${agentEmail}`);
      }

      // Asociar automáticamente con deudor si existe
      await this.associateDebtorToClient(chat);
    }

    // Crear mensaje
    const message = await this.create({
      chatId: chat.id,
      externalId: data.externalId,
      type: data.type,
      direction: MessageDirection.INBOUND,
      senderType: MessageSenderType.CONTACT,
      content: data.content,
      mediaUrl: data.mediaUrl,
      mediaFileName: data.mediaFileName,
      mediaMimeType: data.mediaMimeType,
      metadata: { timestamp: data.timestamp },
    });

    await this.updateStatus(message.id, MessageStatus.DELIVERED);

    this.logger.log(
      `Mensaje entrante procesado: ${message.id} de ${data.contactPhone}`,
    );

    return message;
  }

  /**
   * Actualizar estado del mensaje
   */
  async updateStatus(
    id: string,
    status: MessageStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = { status };

    if (status === MessageStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === MessageStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === MessageStatus.READ) {
      updateData.readAt = new Date();
    } else if (status === MessageStatus.FAILED) {
      updateData.errorMessage = errorMessage;
    }

    await this.messageRepository.update(id, updateData);

    // Emitir evento de cambio de estado
    this.eventEmitter.emit('message.status.updated', { id, status });
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(chatId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({
        status: MessageStatus.READ,
        readAt: new Date(),
      })
      .where('chatId = :chatId', { chatId })
      .andWhere('direction = :direction', { direction: MessageDirection.INBOUND })
      .andWhere('status != :status', { status: MessageStatus.READ })
      .execute();

    // Resetear contador no leído del chat
    await this.chatsService.resetUnreadCount(chatId);

    this.logger.log(`Mensajes marcados como leídos en chat ${chatId}`);
  }

  /**
   * Obtener estadísticas de mensajes
   */
  async getStats(chatId: string) {
    const [total, sent, delivered, read, failed] = await Promise.all([
      this.messageRepository.count({ where: { chatId } }),
      this.messageRepository.count({
        where: { chatId, status: MessageStatus.SENT },
      }),
      this.messageRepository.count({
        where: { chatId, status: MessageStatus.DELIVERED },
      }),
      this.messageRepository.count({
        where: { chatId, status: MessageStatus.READ },
      }),
      this.messageRepository.count({
        where: { chatId, status: MessageStatus.FAILED },
      }),
    ]);

    return { total, sent, delivered, read, failed };
  }

  /**
   * Listener: Procesar mensajes entrantes de WhatsApp
   */
  @OnEvent('whatsapp.message.received')
  async handleIncomingWhatsAppMessage(data: {
    provider: string;
    from: string;
    content: string;
    type: string;
    messageId: string;
    timestamp: Date;
    sessionName: string;
    // Campos de multimedia
    mediaUrl?: string;
    fileName?: string;
    mimeType?: string;
    isMedia?: boolean;
  }) {
    try {
      // Normalizar el número de teléfono (eliminar @c.us y otros sufijos)
      const normalizedPhone = normalizeWhatsAppPhone(data.from);
      this.logger.log(`📨 Mensaje entrante de WhatsApp: ${data.from} -> ${normalizedPhone} - "${data.content}"`);

      // Validar que el número normalizado sea válido
      if (!normalizedPhone || normalizedPhone.length < 8) {
        this.logger.warn(`❌ Número de teléfono inválido después de normalizar: ${data.from} -> ${normalizedPhone}`);
        return;
      }

      // 1. Buscar el número de WhatsApp
      // Para Twilio, sessionName contiene el número de teléfono
      // Para WPPConnect, sessionName es el nombre de la sesión
      let whatsappNumber = await this.whatsappNumberRepository.findOne({
        where: { sessionName: data.sessionName },
        relations: ['campaign'],
      });

      // Si no se encuentra por sessionName, buscar por phoneNumber (para Twilio)
      if (!whatsappNumber) {
        whatsappNumber = await this.whatsappNumberRepository.findOne({
          where: { phoneNumber: data.sessionName },
          relations: ['campaign'],
        });
      }

      // También intentar buscar con el + al inicio
      if (!whatsappNumber) {
        whatsappNumber = await this.whatsappNumberRepository.findOne({
          where: { phoneNumber: `+${data.sessionName}` },
          relations: ['campaign'],
        });
      }

      if (!whatsappNumber) {
        this.logger.warn(`❌ Número de WhatsApp no encontrado para sessionName/phoneNumber: ${data.sessionName}`);
        return;
      }

      this.logger.log(`✅ Número WhatsApp encontrado: ${whatsappNumber.displayName} (${whatsappNumber.provider}) - Campaña: ${whatsappNumber.campaign?.name}`);

      // 2. Buscar o crear cliente (buscar tanto por número normalizado como original)
      let client = await this.clientRepository.findOne({
        where: [
          { phone: normalizedPhone },
          { phone: data.from },
        ],
      });

      if (!client) {
        this.logger.log(`📝 Creando nuevo cliente: ${normalizedPhone}`);
        client = this.clientRepository.create({
          phone: normalizedPhone,
          fullName: normalizedPhone, // Temporal, se actualizará después
          status: ClientStatus.LEAD, // Nuevo cliente entrante es un lead
        });
        client = await this.clientRepository.save(client);
      } else if (client.phone !== normalizedPhone) {
        // Si el cliente existe pero tiene el teléfono sin normalizar, actualizarlo
        client.phone = normalizedPhone;
        await this.clientRepository.save(client);
        this.logger.log(`📝 Cliente actualizado con teléfono normalizado: ${normalizedPhone}`);
      }

      // 3. Buscar chat existente por teléfono normalizado o crear uno nuevo
      const existingChatsResult = await this.chatsService.findAll({
        campaignId: whatsappNumber.campaignId,
      });
      const existingChats = existingChatsResult.data || [];
      
      // Buscar tanto por teléfono normalizado como original
      let chat = existingChats.find(c => 
        (c.contactPhone === normalizedPhone || c.contactPhone === data.from) &&
        (c.status === 'waiting' || c.status === 'bot' || c.status === 'active' || c.status === 'pending')
      );

      if (!chat) {
        this.logger.log(`💬 Creando nuevo chat para ${normalizedPhone}`);
        chat = await this.chatsService.create({
          contactName: client.fullName !== normalizedPhone ? client.fullName : normalizedPhone,
          contactPhone: normalizedPhone,
          externalId: `wpp_${normalizedPhone}_${Date.now()}`,
          campaignId: whatsappNumber.campaignId,
          whatsappNumberId: whatsappNumber.id,
          // Guardar el chatId original de WhatsApp (puede ser @lid o @c.us)
          metadata: { whatsappChatId: data.from },
        });
        
        // Asociar el cliente al chat después de crearlo
        chat.clientId = client.id;
        await this.chatsService.update(chat.id, { clientId: client.id } as any);
      } else if (data.from && data.from.includes('@lid') && (!chat.metadata || !chat.metadata.whatsappChatId)) {
        // Si el chat existe pero no tiene whatsappChatId y viene con @lid, actualizarlo
        this.logger.log(`📝 Actualizando chat ${chat.id} con whatsappChatId: ${data.from}`);
        await this.chatsService.update(chat.id, { 
          metadata: { ...chat.metadata, whatsappChatId: data.from } 
        } as any);
        chat.metadata = { ...chat.metadata, whatsappChatId: data.from };
      }

      this.logger.log(`✅ Chat encontrado/creado: ${chat.id}`);

      // 4. Determinar tipo de mensaje
      let messageType = MessageType.TEXT;
      if (data.type === 'image') {
        messageType = MessageType.IMAGE;
      } else if (data.type === 'audio' || data.type === 'ptt') {
        messageType = MessageType.AUDIO;
      } else if (data.type === 'video') {
        messageType = MessageType.VIDEO;
      } else if (data.type === 'document') {
        messageType = MessageType.DOCUMENT;
      }

      this.logger.log(`💬 Guardando mensaje tipo: ${messageType}`);

      // 5. Verificar si el mensaje ya existe (evitar duplicados)
      const existingMessage = await this.messageRepository.findOne({
        where: { externalId: data.messageId },
      });

      if (existingMessage) {
        this.logger.warn(`⚠️ Mensaje duplicado detectado (externalId: ${data.messageId}), ignorando...`);
        return;
      }

      // 6. Guardar el mensaje
      const message = this.messageRepository.create({
        chatId: chat.id,
        content: data.content,
        type: messageType,
        direction: MessageDirection.INBOUND,
        senderType: MessageSenderType.CONTACT,
        status: MessageStatus.DELIVERED,
        externalId: data.messageId,
        // Guardar datos de multimedia
        mediaUrl: data.mediaUrl || null,
        mediaFileName: data.fileName || null,
        mediaMimeType: data.mimeType || null,
      });

      const savedMessage = await this.messageRepository.save(message);
      this.logger.log(`✅ Mensaje guardado: ${savedMessage.id} - Tipo: ${messageType}`);

      // 7. Actualizar última actividad del chat
      await this.chatsService.updateLastActivity(chat.id, data.content);

      // 7.1. Si es un chat creado manualmente, activar cuando el cliente responde
      if (chat.metadata?.createdManually && chat.metadata?.waitingClientResponse) {
        this.logger.log(`📲 Chat manual ${chat.id} - Cliente respondió, activando chat`);
        await this.chatsService.activateOnClientResponse(chat.id);
      }

      // 8. Emitir evento para Socket.IO y Bot
      this.eventEmitter.emit('message.created', {
        message: savedMessage,
        chat,
      });

      this.logger.log(`🚀 Evento message.created emitido correctamente`);

    } catch (error) {
      this.logger.error(`❌ Error procesando mensaje entrante de WhatsApp: ${error.message}`, error.stack);
    }
  }

  /**
   * Busca deudor por teléfono y crea/actualiza cliente asociado al chat
   */
  private async associateDebtorToClient(chat: any): Promise<void> {
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
        let collectionStatus = CollectionStatus.PENDING;
        if (debtor.status === 'contacted') {
          collectionStatus = CollectionStatus.CONTACTED;
        } else if (debtor.status === 'promise') {
          collectionStatus = CollectionStatus.PROMISE;
        } else if (debtor.status === 'paid') {
          collectionStatus = CollectionStatus.PAID;
        } else if (debtor.status === 'legal') {
          collectionStatus = CollectionStatus.LEGAL;
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
      } else {
        this.logger.log(`ℹ️ Cliente ya existía: ${client.id}`);
      }

      // Asociar cliente con el chat
      await this.chatsService.update(chat.id, { clientId: client.id });
      this.logger.log(`✅ Chat ${chat.id} asociado al cliente ${client.id}`);

    } catch (error) {
      this.logger.error(`❌ Error asociando deudor con cliente: ${error.message}`, error.stack);
    }
  }
}
