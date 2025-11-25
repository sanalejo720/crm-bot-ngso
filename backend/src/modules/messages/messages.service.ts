import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { WhatsappNumber } from '../whatsapp/entities/whatsapp-number.entity';
import { Client, ClientStatus } from '../clients/entities/client.entity';

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

    try {
      // Enviar a través del servicio WhatsApp
      const result = await this.whatsappService.sendMessage(
        chat.whatsappNumber.id,
        chat.contactPhone,
        content,
        MessageType.TEXT,
      );

      // Crear registro del mensaje
      const message = await this.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.AGENT,
        content,
        externalId: result.messageId,
        senderId,
        metadata: result.metadata,
      });

      // Actualizar estado a enviado
      await this.updateStatus(message.id, MessageStatus.SENT);

      return message;
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`, error.stack);

      // Crear mensaje con estado fallido
      const message = await this.create({
        chatId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.AGENT,
        content,
        senderId,
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
      // Por simplicidad, asumimos que está disponible
      const whatsappNumber = await this.whatsappService.findOne(
        data.whatsappNumberId,
      );

      chat = await this.chatsService.create({
        externalId: `wa-${data.whatsappNumberId}-${data.contactPhone}`,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        campaignId: whatsappNumber.campaignId,
        whatsappNumberId: data.whatsappNumberId,
      });
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
  }) {
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
          status: ClientStatus.LEAD, // Nuevo cliente entrante es un lead
        });
        client = await this.clientRepository.save(client);
      }

      // 3. Buscar chat existente por externalId o crear uno nuevo
      const existingChats = await this.chatsService.findAll({
        campaignId: whatsappNumber.campaignId,
      });
      
      let chat = existingChats.find(c => 
        c.contactPhone === data.from &&
        (c.status === 'waiting' || c.status === 'bot' || c.status === 'active' || c.status === 'pending')
      );

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
        await this.chatsService.update(chat.id, { clientId: client.id } as any);
      }

      this.logger.log(`✅ Chat encontrado/creado: ${chat.id}`);

      // 4. Guardar el mensaje
      const message = this.messageRepository.create({
        chatId: chat.id,
        content: data.content,
        type: data.type === 'image' ? MessageType.IMAGE : MessageType.TEXT,
        direction: MessageDirection.INBOUND,
        senderType: MessageSenderType.CONTACT,
        status: MessageStatus.DELIVERED,
        externalId: data.messageId,
      });

      const savedMessage = await this.messageRepository.save(message);
      this.logger.log(`✅ Mensaje guardado: ${savedMessage.id}`);

      // 5. Actualizar última actividad del chat
      await this.chatsService.updateLastActivity(chat.id, data.content);

      // 6. Emitir evento para Socket.IO y Bot
      this.eventEmitter.emit('message.created', {
        message: savedMessage,
        chat,
      });

      this.logger.log(`🚀 Evento message.created emitido correctamente`);

    } catch (error) {
      this.logger.error(`❌ Error procesando mensaje entrante de WhatsApp: ${error.message}`, error.stack);
    }
  }
}
