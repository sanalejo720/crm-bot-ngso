import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface MetaMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  text?: { body: string };
  image?: { link: string; caption?: string };
  document?: { link: string; filename?: string };
}

@Injectable()
export class MetaCloudService {
  private readonly logger = new Logger(MetaCloudService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly version: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.accessToken = this.configService.get('META_WHATSAPP_TOKEN');
    this.phoneNumberId = this.configService.get('META_WHATSAPP_PHONE_NUMBER_ID');
    this.version = this.configService.get('META_WHATSAPP_VERSION', 'v18.0');
    this.apiUrl = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}`;

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('Meta WhatsApp credentials not configured');
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(to: string, text: string): Promise<any> {
    try {
      const payload: MetaMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      };

      const response = await axios.post(`${this.apiUrl}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Message sent to ${to} via Meta Cloud API`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending message via Meta: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send message via Meta Cloud API');
    }
  }

  /**
   * Enviar imagen
   */
  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<any> {
    try {
      const payload: MetaMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      };

      const response = await axios.post(`${this.apiUrl}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Image message sent to ${to} via Meta Cloud API`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending image via Meta: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send image via Meta Cloud API');
    }
  }

  /**
   * Enviar documento
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename?: string): Promise<any> {
    try {
      const payload: MetaMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { link: documentUrl, filename },
      };

      const response = await axios.post(`${this.apiUrl}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Document sent to ${to} via Meta Cloud API`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending document via Meta: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send document via Meta Cloud API');
    }
  }

  /**
   * Procesar webhook entrante de Meta
   */
  async processWebhook(payload: any): Promise<void> {
    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return;
      }

      // Procesar mensajes entrantes
      if (value.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message, value);
        }
      }

      // Procesar cambios de estado
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.processMessageStatus(status);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing Meta webhook: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesar mensaje entrante
   */
  private async processIncomingMessage(message: any, value: any): Promise<void> {
    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;

    let content = '';
    let type = 'text';

    if (message.type === 'text') {
      content = message.text.body;
    } else if (message.type === 'image') {
      content = message.image.id;
      type = 'image';
    } else if (message.type === 'document') {
      content = message.document.id;
      type = 'document';
    }

    // Emitir evento para que otros servicios procesen
    this.eventEmitter.emit('whatsapp.message.received', {
      provider: 'meta',
      from,
      content,
      type,
      messageId,
      timestamp: new Date(parseInt(timestamp) * 1000),
      phoneNumberId: value.metadata.phone_number_id,
    });

    this.logger.log(`Received message from ${from}: ${content}`);
  }

  /**
   * Procesar estado de mensaje
   */
  private async processMessageStatus(status: any): Promise<void> {
    const messageId = status.id;
    const newStatus = status.status; // sent, delivered, read, failed

    this.eventEmitter.emit('whatsapp.message.status', {
      provider: 'meta',
      messageId,
      status: newStatus,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
    });

    this.logger.log(`Message ${messageId} status updated to ${newStatus}`);
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Message ${messageId} marked as read`);
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
    }
  }

  /**
   * Verificar salud de la conexión
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`https://graph.facebook.com/${this.version}/${this.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Meta Cloud API health check failed: ${error.message}`);
      return false;
    }
  }
}
