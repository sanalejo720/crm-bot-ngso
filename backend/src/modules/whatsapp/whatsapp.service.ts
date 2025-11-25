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
import { MessageType } from '../messages/entities/message.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappNumber)
    private whatsappNumberRepository: Repository<WhatsappNumber>,
    private metaCloudService: MetaCloudService,
    private wppConnectService: WppConnectService,
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
}
