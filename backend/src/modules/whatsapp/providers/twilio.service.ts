import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageType } from '../../messages/entities/message.entity';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private clients: Map<string, ReturnType<typeof twilio>> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Inicializar cliente de Twilio
   */
  initializeClient(
    whatsappNumberId: string,
    accountSid: string,
    authToken: string,
  ): void {
    try {
      const client = twilio(accountSid, authToken);
      this.clients.set(whatsappNumberId, client);
      this.logger.log(`Cliente Twilio inicializado para ${whatsappNumberId}`);
    } catch (error) {
      this.logger.error(`Error inicializando Twilio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener cliente de Twilio
   */
  private getClient(whatsappNumberId: string): twilio.Twilio {
    const client = this.clients.get(whatsappNumberId);
    if (!client) {
      throw new BadRequestException('Cliente Twilio no inicializado');
    }
    return client;
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(
    whatsappNumberId: string,
    from: string, // Formato: whatsapp:+14155238886
    to: string, // Formato: whatsapp:+573001234567
    body: string,
  ): Promise<{ messageId: string; metadata?: any }> {
    try {
      const client = this.getClient(whatsappNumberId);

      // Asegurar formato correcto
      const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const message = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body,
      });

      this.logger.log(`Mensaje enviado vía Twilio: ${message.sid}`);

      return {
        messageId: message.sid,
        metadata: {
          status: message.status,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
        },
      };
    } catch (error) {
      this.logger.error(`Error enviando mensaje Twilio: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enviar mensaje con media (imagen, documento, etc)
   */
  async sendMediaMessage(
    whatsappNumberId: string,
    from: string,
    to: string,
    body: string,
    mediaUrl: string,
  ): Promise<{ messageId: string; metadata?: any }> {
    try {
      const client = this.getClient(whatsappNumberId);

      const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const message = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body,
        mediaUrl: [mediaUrl],
      });

      this.logger.log(`Mensaje con media enviado vía Twilio: ${message.sid}`);

      return {
        messageId: message.sid,
        metadata: {
          status: message.status,
          dateCreated: message.dateCreated,
        },
      };
    } catch (error) {
      this.logger.error(`Error enviando media Twilio: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Procesar webhook de Twilio (mensajes entrantes y actualizaciones de estado)
   */
  async processWebhook(payload: any): Promise<void> {
    try {
      this.logger.log('Webhook de Twilio recibido');
      this.logger.debug(JSON.stringify(payload, null, 2));

      const {
        From: from, // whatsapp:+573001234567
        To: to, // whatsapp:+14155238886
        Body: body,
        MessageSid: messageSid,
        MediaUrl0: mediaUrl,
        NumMedia: numMedia,
        ProfileName: profileName,
        MessageStatus: messageStatus, // Para webhooks de status
        SmsStatus: smsStatus, // Alternativo para status
      } = payload;

      // Verificar si es un webhook de actualización de estado (no un mensaje entrante)
      const status = messageStatus || smsStatus;
      if (status && !body) {
        // Es un webhook de status update, no un mensaje entrante
        this.logger.log(`📊 Status update recibido: ${status} para mensaje ${messageSid}`);
        
        // Emitir evento de actualización de estado
        this.eventEmitter.emit('whatsapp.message.status', {
          provider: 'twilio',
          messageId: messageSid,
          status: status,
          errorCode: payload.ErrorCode,
          errorMessage: payload.ErrorMessage,
          timestamp: new Date(),
        });
        
        this.logger.log(`✅ Status update procesado: ${messageSid} -> ${status}`);
        return; // No procesar como mensaje entrante
      }

      // Es un mensaje entrante real (tiene Body)
      if (!body && (!numMedia || numMedia === '0')) {
        this.logger.warn(`⚠️ Webhook sin contenido de mensaje, ignorando`);
        return;
      }

      // Limpiar formato de número (quitar 'whatsapp:' y '+')
      const contactPhone = from.replace('whatsapp:', '').replace('+', '');
      const whatsappNumberClean = to.replace('whatsapp:', '').replace('+', '');

      this.logger.log(`📱 Mensaje entrante de: ${contactPhone}, Para: ${whatsappNumberClean}, Contenido: "${body}"`);

      // Emitir evento para que el sistema procese el mensaje
      // Usar el formato esperado por el listener en messages.service.ts
      this.eventEmitter.emit('whatsapp.message.received', {
        provider: 'twilio',
        from: contactPhone, // Número del cliente que envía el mensaje
        content: body || '',
        type: numMedia > 0 ? 'image' : 'text',
        messageId: messageSid,
        timestamp: new Date(),
        sessionName: whatsappNumberClean, // Número de Twilio que recibe el mensaje (nuestro número)
        // Campos adicionales
        mediaUrl: numMedia > 0 ? mediaUrl : null,
        isMedia: numMedia > 0,
        contactName: profileName || contactPhone,
        twilioData: {
          whatsappNumber: whatsappNumberClean,
          contactPhone,
          numMedia,
        },
      });

      this.logger.log(`✅ Mensaje entrante procesado: ${messageSid}`);
    } catch (error) {
      this.logger.error(`Error procesando webhook Twilio: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verificar estado de mensaje
   */
  async getMessageStatus(
    whatsappNumberId: string,
    messageSid: string,
  ): Promise<any> {
    try {
      const client = this.getClient(whatsappNumberId);
      const message = await client.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado de mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remover cliente
   */
  removeClient(whatsappNumberId: string): void {
    this.clients.delete(whatsappNumberId);
    this.logger.log(`Cliente Twilio removido: ${whatsappNumberId}`);
  }
}
