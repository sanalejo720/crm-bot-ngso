import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WhatsappNumber,
  WhatsappProvider,
  ConnectionStatus,
} from './entities/whatsapp-number.entity';
import { MetaCloudService } from './providers/meta-cloud.service';
import { WppConnectService } from './providers/wppconnect.service';
import { TwilioService } from './providers/twilio.service';
import { MessageType } from '../messages/entities/message.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappNumber)
    private whatsappNumberRepository: Repository<WhatsappNumber>,
    private metaCloudService: MetaCloudService,
    private wppConnectService: WppConnectService,
    private twilioService: TwilioService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Obtener número de WhatsApp por ID
   */
  async findOne(id: string): Promise<WhatsappNumber> {
    const number = await this.whatsappNumberRepository.findOne({
      where: { id },
      relations: ['campaign'],
    });

    if (!number) {
      throw new NotFoundException(`Número WhatsApp con ID ${id} no encontrado`);
    }

    return number;
  }

  /**
   * Enviar mensaje a través del proveedor correspondiente
   */
  async sendMessage(
    whatsappNumberId: string,
    to: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
  ): Promise<{ messageId: string; metadata?: any }> {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    if (!whatsappNumber.isActive) {
      throw new BadRequestException('Número WhatsApp inactivo');
    }

    if (whatsappNumber.status !== ConnectionStatus.CONNECTED) {
      throw new BadRequestException('Número WhatsApp no conectado');
    }

    try {
      if (whatsappNumber.provider === WhatsappProvider.META_CLOUD) {
        return await this.sendViaMeta(whatsappNumber, to, content, type, mediaUrl);
      } else if (whatsappNumber.provider === WhatsappProvider.WPPCONNECT) {
        return await this.sendViaWppConnect(whatsappNumber, to, content, type, mediaUrl);
      } else if (whatsappNumber.provider === WhatsappProvider.TWILIO) {
        return await this.sendViaTwilio(whatsappNumber, to, content, type, mediaUrl);
      }

      throw new BadRequestException('Proveedor no soportado');
    } catch (error) {
      this.logger.error(
        `Error enviando mensaje desde ${whatsappNumberId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Procesar webhook de Meta
   */
  async processMetaWebhook(payload: any): Promise<void> {
    try {
      await this.metaCloudService.processWebhook(payload);
      this.logger.log('Webhook de Meta procesado correctamente');
    } catch (error) {
      this.logger.error(`Error procesando webhook de Meta: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Procesar webhook de Twilio
   */
  async processTwilioWebhook(payload: any): Promise<void> {
    try {
      await this.twilioService.processWebhook(payload);
      this.logger.log('Webhook de Twilio procesado correctamente');
    } catch (error) {
      this.logger.error(`Error procesando webhook de Twilio: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enviar mensaje a través de Meta Cloud API
   */
  private async sendViaMeta(
    whatsappNumber: WhatsappNumber,
    to: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
  ) {
    this.logger.log(`📤 Enviando via Meta Cloud - WhatsApp ID: ${whatsappNumber.id}`);
    this.logger.log(`📱 Phone Number ID: ${whatsappNumber.phoneNumberId}`);
    this.logger.log(`👤 Destino: ${to}, Tipo: ${type}`);

    if (type === MessageType.TEXT) {
      const result = await this.metaCloudService.sendTextMessageWithCredentials(
        whatsappNumber.phoneNumberId,
        whatsappNumber.accessToken,
        to,
        content,
      );
      return {
        messageId: result.messages[0].id,
        metadata: result,
      };
    } else if (type === MessageType.IMAGE) {
      const result = await this.metaCloudService.sendImageMessageWithCredentials(
        whatsappNumber.phoneNumberId,
        whatsappNumber.accessToken,
        to,
        mediaUrl,
        content,
      );
      return {
        messageId: result.messages[0].id,
        metadata: result,
      };
    }

    throw new BadRequestException(`Tipo de mensaje ${type} no soportado con Meta`);
  }

  /**
   * Enviar mensaje a través de WPPConnect
   */
  private async sendViaWppConnect(
    whatsappNumber: WhatsappNumber,
    to: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
  ) {
    const sessionName = whatsappNumber.phoneNumber; // Usar número como sessionName
    
    this.logger.log(`📤 Enviando via WPPConnect - WhatsApp ID: ${whatsappNumber.id}, Phone: ${whatsappNumber.phoneNumber}`);
    this.logger.log(`📱 SessionName: ${sessionName}, Destino: ${to}, Tipo: ${type}`);

    if (type === MessageType.TEXT) {
      const result = await this.wppConnectService.sendTextMessage(sessionName, to, content);
      return {
        messageId: result.id || `wpp-${Date.now()}`,
        metadata: result,
      };
    } else if (type === MessageType.IMAGE) {
      const result = await this.wppConnectService.sendImageMessage(
        sessionName,
        to,
        mediaUrl,
        content,
      );
      return {
        messageId: result.id || `wpp-${Date.now()}`,
        metadata: result,
      };
    }

    throw new BadRequestException(`Tipo de mensaje ${type} no soportado con WPPConnect`);
  }

  /**
   * Enviar mensaje a través de Twilio
   */
  private async sendViaTwilio(
    whatsappNumber: WhatsappNumber,
    to: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
  ) {
    this.logger.log(`📤 Enviando via Twilio - WhatsApp ID: ${whatsappNumber.id}`);
    this.logger.log(`📱 From: ${whatsappNumber.twilioPhoneNumber}, To: ${to}, Tipo: ${type}`);

    // Inicializar cliente si no existe
    this.twilioService.initializeClient(
      whatsappNumber.id,
      whatsappNumber.twilioAccountSid,
      whatsappNumber.twilioAuthToken,
    );

    if (type === MessageType.TEXT) {
      return await this.twilioService.sendTextMessage(
        whatsappNumber.id,
        whatsappNumber.twilioPhoneNumber,
        to,
        content,
      );
    } else if (type === MessageType.IMAGE || type === MessageType.DOCUMENT) {
      return await this.twilioService.sendMediaMessage(
        whatsappNumber.id,
        whatsappNumber.twilioPhoneNumber,
        to,
        content,
        mediaUrl,
      );
    }

    throw new BadRequestException(`Tipo de mensaje ${type} no soportado con Twilio`);
  }

  /**
   * Iniciar sesión de WPPConnect
   */
  async startWppConnectSession(whatsappNumberId: string) {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    if (whatsappNumber.provider !== WhatsappProvider.WPPCONNECT) {
      throw new BadRequestException('Este número no usa WPPConnect');
    }

    const sessionName = whatsappNumber.phoneNumber; // Usar número de teléfono como sessionName

    this.logger.log(`Iniciando sesión WPPConnect: ${sessionName} (ID: ${whatsappNumberId})`);

    try {
      const result = await this.wppConnectService.startSession(sessionName, whatsappNumberId);

      await this.whatsappNumberRepository.update(whatsappNumberId, {
        status: ConnectionStatus.QR_WAITING,
        qrCode: result.qrCode,
      });

      this.logger.log(`Sesión WPPConnect iniciada exitosamente para ${whatsappNumberId}`);

      return {
        success: true,
        message: 'Sesión iniciada. Escanea el QR code.',
        sessionName,
        qrCode: result.qrCode,
        status: result.status,
      };
    } catch (error) {
      this.logger.error(`Error al iniciar sesión WPPConnect: ${error.message}`, error.stack);
      
      await this.whatsappNumberRepository.update(whatsappNumberId, {
        status: ConnectionStatus.ERROR,
      });

      this.logger.error(`Error iniciando sesión WPPConnect: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estado de sesión WPPConnect
   */
  async getWppConnectStatus(whatsappNumberId: string) {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    if (whatsappNumber.provider !== WhatsappProvider.WPPCONNECT) {
      throw new BadRequestException('Este número no usa WPPConnect');
    }

    const sessionName = whatsappNumber.sessionName || `session-${whatsappNumberId}`;

    try {
      const status = await this.wppConnectService.getSessionStatus(sessionName);

      // Actualizar estado en base de datos
      const newStatus =
        status.connected
          ? ConnectionStatus.CONNECTED
          : ConnectionStatus.DISCONNECTED;

      if (whatsappNumber.status !== newStatus) {
        await this.whatsappNumberRepository.update(whatsappNumberId, {
          status: newStatus,
          lastConnectedAt: newStatus === ConnectionStatus.CONNECTED ? new Date() : null,
        });
      }

      return status;
    } catch (error) {
      this.logger.error(`Error obteniendo estado WPPConnect: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar estado de conexión
   */
  async updateConnectionStatus(
    whatsappNumberId: string,
    status: ConnectionStatus,
  ): Promise<void> {
    await this.whatsappNumberRepository.update(whatsappNumberId, {
      status,
      lastConnectedAt: status === ConnectionStatus.CONNECTED ? new Date() : null,
    });

    this.logger.log(`Estado actualizado para ${whatsappNumberId}: ${status}`);

    // Emitir evento
    this.eventEmitter.emit('whatsapp.status.changed', {
      whatsappNumberId,
      status,
    });
  }

  /**
   * Obtener todos los números activos
   */
  async findAllActive(): Promise<WhatsappNumber[]> {
    return this.whatsappNumberRepository.find({
      where: { isActive: true },
      relations: ['campaign'],
    });
  }

  /**
   * Obtener números por campaña
   */
  async findByCampaign(campaignId: string): Promise<WhatsappNumber[]> {
    return this.whatsappNumberRepository.find({
      where: { campaignId, isActive: true },
    });
  }

  /**
   * Debug: Ver sesiones activas en WPPConnect
   */
  async getDebugSessions() {
    const sessions = this.wppConnectService.getActiveSessions();
    const numbers = await this.whatsappNumberRepository.find({
      where: { isActive: true },
    });

    return {
      wppConnectSessions: sessions,
      databaseNumbers: numbers.map(n => ({
        id: n.id,
        phone: n.phoneNumber,
        sessionName: n.sessionName,
        status: n.status,
      })),
    };
  }

  /**
   * Enviar mensaje con botones interactivos
   * Para Twilio y WPPConnect: convierte botones a texto con opciones numeradas
   * ya que los botones interactivos nativos requieren templates aprobados
   */
  async sendButtonsMessage(
    whatsappNumberId: string,
    to: string,
    title: string,
    description: string,
    buttons: Array<{ id: string; text: string }>,
  ) {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    // Convertir botones a texto con opciones numeradas
    // Esto funciona para todos los proveedores sin necesidad de templates aprobados
    let messageText = '';
    
    if (title) {
      messageText += `*${title}*\n\n`;
    }
    
    if (description) {
      messageText += `${description}\n\n`;
    }
    
    // Agregar opciones numeradas
    buttons.forEach((button, index) => {
      messageText += `${index + 1}. ${button.text}\n`;
    });
    
    messageText += '\n_Responde con el número de tu opción_';

    this.logger.log(`📤 Enviando mensaje con opciones - To: ${to}, Provider: ${whatsappNumber.provider}`);

    // Enviar como mensaje de texto normal
    return this.sendMessage(whatsappNumberId, to, messageText, MessageType.TEXT);
  }

  /**
   * Enviar lista interactiva
   * Para Twilio y WPPConnect: convierte lista a texto con opciones numeradas
   */
  async sendListMessage(
    whatsappNumberId: string,
    to: string,
    title: string,
    description: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
  ) {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    // Convertir lista a texto con opciones numeradas
    let messageText = '';
    
    if (title) {
      messageText += `*${title}*\n\n`;
    }
    
    if (description) {
      messageText += `${description}\n\n`;
    }
    
    let optionNumber = 1;
    sections.forEach((section) => {
      if (section.title) {
        messageText += `*${section.title}*\n`;
      }
      section.rows.forEach((row) => {
        messageText += `${optionNumber}. ${row.title}`;
        if (row.description) {
          messageText += ` - ${row.description}`;
        }
        messageText += '\n';
        optionNumber++;
      });
      messageText += '\n';
    });
    
    messageText += '_Responde con el número de tu opción_';

    this.logger.log(`📤 Enviando mensaje con lista de opciones - To: ${to}, Provider: ${whatsappNumber.provider}`);

    // Enviar como mensaje de texto normal
    return this.sendMessage(whatsappNumberId, to, messageText, MessageType.TEXT);
  }

  /**
   * Enviar mensaje usando Content Template de Twilio (para botones interactivos reales)
   * @param contentSid - El SID del Content Template (HX...)
   * @param contentVariables - Variables para reemplazar {{1}}, {{2}}, etc.
   */
  async sendContentTemplate(
    whatsappNumberId: string,
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<{ messageId: string; metadata?: any }> {
    const whatsappNumber = await this.findOne(whatsappNumberId);

    if (whatsappNumber.provider !== WhatsappProvider.TWILIO) {
      throw new BadRequestException('Content Templates solo están disponibles para Twilio');
    }

    if (!whatsappNumber.isActive) {
      throw new BadRequestException('Número WhatsApp inactivo');
    }

    // Inicializar cliente si no existe
    this.twilioService.initializeClient(
      whatsappNumber.id,
      whatsappNumber.twilioAccountSid,
      whatsappNumber.twilioAuthToken,
    );

    this.logger.log(`📤 Enviando Content Template ${contentSid} a ${to}`);

    return await this.twilioService.sendContentMessage(
      whatsappNumber.id,
      whatsappNumber.twilioPhoneNumber,
      to,
      contentSid,
      contentVariables,
    );
  }
}
