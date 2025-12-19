import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageType } from '../../messages/entities/message.entity';
import twilio from 'twilio';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private clients: Map<string, ReturnType<typeof twilio>> = new Map();
  // Guardar credenciales para descargar media
  private credentials: Map<string, { accountSid: string; authToken: string }> = new Map();

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
      // Guardar credenciales para descargar media
      this.credentials.set(whatsappNumberId, { accountSid, authToken });
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
        ButtonText: buttonText, // Texto del botón presionado (Quick Reply)
        ButtonPayload: buttonPayload, // ID del botón presionado (Quick Reply)
      } = payload;

      // Verificar si es un webhook de actualización de estado (no un mensaje entrante)
      const status = messageStatus || smsStatus;
      if (status && !body && !buttonText) {
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

      // Determinar el contenido del mensaje
      // Si es un Quick Reply, usar buttonText; si no, usar body
      const messageContent = buttonText || body || '';
      
      // Es un mensaje entrante real (tiene Body o ButtonText)
      if (!messageContent && (!numMedia || numMedia === '0')) {
        this.logger.warn(`⚠️ Webhook sin contenido de mensaje, ignorando`);
        return;
      }

      // Limpiar formato de número (quitar 'whatsapp:' y '+')
      const contactPhone = from.replace('whatsapp:', '').replace('+', '');
      const whatsappNumberClean = to.replace('whatsapp:', '').replace('+', '');

      // Log especial para botones
      if (buttonText) {
        this.logger.log(`🔘 BOTÓN PRESIONADO - Texto: "${buttonText}", Payload: "${buttonPayload}"`);
      }
      
      this.logger.log(`📱 Mensaje entrante de: ${contactPhone}, Para: ${whatsappNumberClean}, Contenido: "${messageContent}"`);

      // Procesar media si existe
      let localMediaUrl: string | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;

      this.logger.log(`📊 Media check: NumMedia=${numMedia}, MediaUrl0=${mediaUrl || 'N/A'}`);

      if (numMedia && parseInt(numMedia) > 0 && mediaUrl) {
        try {
          this.logger.log(`📎 Descargando media de Twilio: ${mediaUrl}`);
          
          // Descargar media con autenticación de Twilio
          const downloadedMedia = await this.downloadTwilioMedia(mediaUrl, whatsappNumberClean, messageSid);
          
          if (downloadedMedia) {
            localMediaUrl = downloadedMedia.localUrl;
            fileName = downloadedMedia.fileName;
            mimeType = downloadedMedia.mimeType;
            this.logger.log(`✅ Media descargado y guardado: ${fileName}, URL local: ${localMediaUrl}`);
          } else {
            this.logger.warn(`⚠️ downloadTwilioMedia retornó null`);
          }
        } catch (mediaError) {
          this.logger.error(`❌ Error descargando media de Twilio: ${mediaError.message}`);
        }
      }

      // Emitir evento para que el sistema procese el mensaje
      // Usar el formato esperado por el listener en messages.service.ts
      // Determinar el tipo de mensaje basado en el mimeType
      let messageType = 'text';
      if (localMediaUrl && mimeType) {
        if (mimeType.startsWith('image/')) {
          messageType = 'image';
        } else if (mimeType.startsWith('audio/')) {
          messageType = 'audio';
        } else if (mimeType.startsWith('video/')) {
          messageType = 'video';
        } else if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('spreadsheet')) {
          messageType = 'document';
        } else if (localMediaUrl) {
          // Si tiene media pero no es ninguno de los anteriores, marcar como document
          messageType = 'document';
        }
      }

      this.eventEmitter.emit('whatsapp.message.received', {
        provider: 'twilio',
        from: contactPhone, // Número del cliente que envía el mensaje
        content: messageContent || (localMediaUrl ? `[${messageType.toUpperCase()}]` : ''),
        type: messageType,
        messageId: messageSid,
        timestamp: new Date(),
        sessionName: whatsappNumberClean, // Número de Twilio que recibe el mensaje (nuestro número)
        // Campos adicionales - usar URL local en vez de URL de Twilio
        mediaUrl: localMediaUrl,
        fileName: fileName,
        mimeType: mimeType,
        isMedia: !!localMediaUrl,
        contactName: profileName || contactPhone,
        // Datos del botón si aplica
        buttonText: buttonText || null,
        buttonPayload: buttonPayload || null,
        twilioData: {
          whatsappNumber: whatsappNumberClean,
          contactPhone,
          numMedia,
          buttonText,
          buttonPayload,
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
   * Enviar mensaje usando Content Template (para botones interactivos)
   * @param contentSid - El SID del Content Template (HX...)
   * @param contentVariables - Variables para reemplazar en el template {{1}}, {{2}}, etc.
   */
  async sendContentMessage(
    whatsappNumberId: string,
    from: string,
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<{ messageId: string; metadata?: any }> {
    try {
      const client = this.getClient(whatsappNumberId);

      const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const messageParams: any = {
        from: fromNumber,
        to: toNumber,
        contentSid,
      };

      // Agregar variables si existen
      if (contentVariables && Object.keys(contentVariables).length > 0) {
        messageParams.contentVariables = JSON.stringify(contentVariables);
      }

      this.logger.log(`📤 Enviando Content Template: ${contentSid} a ${to}`);

      const message = await client.messages.create(messageParams);

      this.logger.log(`✅ Content Template enviado vía Twilio: ${message.sid}`);

      return {
        messageId: message.sid,
        metadata: {
          status: message.status,
          contentSid,
          dateCreated: message.dateCreated,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error enviando Content Template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remover cliente
   */
  removeClient(whatsappNumberId: string): void {
    this.clients.delete(whatsappNumberId);
    this.credentials.delete(whatsappNumberId);
    this.logger.log(`Cliente Twilio removido: ${whatsappNumberId}`);
  }

  /**
   * Descargar media de Twilio y guardar localmente
   */
  private async downloadTwilioMedia(
    mediaUrl: string,
    whatsappNumber: string,
    messageSid: string,
  ): Promise<{ localUrl: string; fileName: string; mimeType: string } | null> {
    try {
      // Buscar credenciales por número de WhatsApp
      let credentials: { accountSid: string; authToken: string } | undefined;
      
      // Primero intentar buscar por número específico
      for (const [id, creds] of this.credentials.entries()) {
        credentials = creds;
        this.logger.log(`📋 Usando credenciales de: ${id}`);
        break; // Usar las primeras credenciales disponibles
      }

      if (!credentials) {
        this.logger.error(`❌ No hay credenciales de Twilio disponibles para descargar media. Total en cache: ${this.credentials.size}`);
        return null;
      }

      // Crear directorio uploads si no existe
      const uploadsDir = path.join(process.cwd(), 'uploads', 'media');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        this.logger.log(`📁 Directorio de uploads creado: ${uploadsDir}`);
      }

      this.logger.log(`📥 Descargando media de: ${mediaUrl}`);

      // Descargar el archivo con autenticación básica de Twilio
      const response = await axios.get(mediaUrl, {
        auth: {
          username: credentials.accountSid,
          password: credentials.authToken,
        },
        responseType: 'arraybuffer',
      });

      // Obtener el tipo de contenido y extensión
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const ext = this.getExtensionFromContentType(contentType);
      
      // Generar nombre de archivo único
      const fileName = `${Date.now()}_${messageSid.substring(0, 10)}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      // Guardar archivo
      fs.writeFileSync(filePath, Buffer.from(response.data));

      this.logger.log(`✅ Media guardado: ${filePath}, Tipo: ${contentType}, Tamaño: ${response.data.length} bytes`);

      return {
        localUrl: `/uploads/media/${fileName}`,
        fileName,
        mimeType: contentType,
      };
    } catch (error) {
      this.logger.error(`❌ Error descargando media de Twilio: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Obtener extensión de archivo desde Content-Type
   */
  private getExtensionFromContentType(contentType: string): string {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'video/mp4': 'mp4',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    };

    return mimeMap[contentType] || 'bin';
  }
}
