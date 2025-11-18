import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as wppconnect from '@wppconnect-team/wppconnect';

@Injectable()
export class WppConnectService {
  private readonly logger = new Logger(WppConnectService.name);
  private clients: Map<string, any> = new Map();
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.secretKey = this.configService.get('WPPCONNECT_SECRET_KEY', 'default-secret');
  }

  /**
   * Iniciar sesión de WhatsApp
   */
  async startSession(sessionName: string): Promise<{ qrCode?: string; status: string }> {
    try {
      if (this.clients.has(sessionName)) {
        return { status: 'already-connected' };
      }

      let qrCodeData: string;

      const client = await wppconnect.create({
        session: sessionName,
        catchQR: (base64Qr, asciiQR) => {
          qrCodeData = base64Qr;
          this.logger.log(`QR Code generated for session ${sessionName}`);
          
          // Emitir evento con QR Code
          this.eventEmitter.emit('whatsapp.qrcode.generated', {
            sessionName,
            qrCode: base64Qr,
          });
        },
        statusFind: (statusSession, session) => {
          this.logger.log(`Session ${session} status: ${statusSession}`);
          
          this.eventEmitter.emit('whatsapp.session.status', {
            sessionName: session,
            status: statusSession,
          });

          if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
            this.clients.set(sessionName, client);
            this.setupEventListeners(client, sessionName);
          }
        },
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false,
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
        autoClose: 60000,
        disableWelcome: true,
      });

      if (qrCodeData) {
        return { qrCode: qrCodeData, status: 'qr-generated' };
      }

      return { status: 'authenticated' };
    } catch (error) {
      this.logger.error(`Error starting WPPConnect session: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to start WPPConnect session');
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(client: any, sessionName: string): void {
    // Mensajes entrantes
    client.onMessage(async (message: any) => {
      this.eventEmitter.emit('whatsapp.message.received', {
        provider: 'wppconnect',
        from: message.from,
        content: message.body,
        type: message.type,
        messageId: message.id,
        timestamp: new Date(message.timestamp * 1000),
        sessionName,
      });

      this.logger.log(`Received message from ${message.from}: ${message.body}`);
    });

    // Estado de conexión
    client.onStateChange((state: string) => {
      this.logger.log(`WPPConnect session ${sessionName} state: ${state}`);
      
      if (state === 'CONFLICT' || state === 'UNPAIRED') {
        this.clients.delete(sessionName);
      }
    });
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(sessionName: string, to: string, text: string): Promise<any> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new BadRequestException(`Session ${sessionName} not found or not authenticated`);
      }

      // Asegurar formato de número
      const formattedNumber = this.formatNumber(to);
      
      const result = await client.sendText(formattedNumber, text);
      this.logger.log(`Message sent to ${to} via WPPConnect`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error sending message via WPPConnect: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send message via WPPConnect');
    }
  }

  /**
   * Enviar imagen
   */
  async sendImageMessage(
    sessionName: string,
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<any> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new BadRequestException(`Session ${sessionName} not found`);
      }

      const formattedNumber = this.formatNumber(to);
      
      const result = await client.sendImage(formattedNumber, imageUrl, 'image', caption);
      this.logger.log(`Image sent to ${to} via WPPConnect`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error sending image via WPPConnect: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send image via WPPConnect');
    }
  }

  /**
   * Enviar archivo
   */
  async sendFileMessage(
    sessionName: string,
    to: string,
    fileUrl: string,
    filename?: string,
  ): Promise<any> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new BadRequestException(`Session ${sessionName} not found`);
      }

      const formattedNumber = this.formatNumber(to);
      
      const result = await client.sendFile(formattedNumber, fileUrl, filename || 'file', '');
      this.logger.log(`File sent to ${to} via WPPConnect`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error sending file via WPPConnect: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send file via WPPConnect');
    }
  }

  /**
   * Cerrar sesión
   */
  async closeSession(sessionName: string): Promise<void> {
    try {
      const client = this.clients.get(sessionName);
      if (client) {
        await client.close();
        this.clients.delete(sessionName);
        this.logger.log(`Session ${sessionName} closed`);
      }
    } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`);
    }
  }

  /**
   * Verificar estado de sesión
   */
  async getSessionStatus(sessionName: string): Promise<{ connected: boolean; phone?: string }> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        return { connected: false };
      }

      const isConnected = await client.isConnected();
      if (!isConnected) {
        return { connected: false };
      }

      const hostDevice = await client.getHostDevice();
      return {
        connected: true,
        phone: hostDevice?.id?.user,
      };
    } catch (error) {
      this.logger.error(`Error getting session status: ${error.message}`);
      return { connected: false };
    }
  }

  /**
   * Obtener todas las sesiones activas
   */
  getActiveSessions(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Formatear número de teléfono
   */
  private formatNumber(number: string): string {
    // Remover caracteres no numéricos
    let formatted = number.replace(/\D/g, '');
    
    // Agregar @c.us si no está presente
    if (!formatted.includes('@')) {
      formatted = `${formatted}@c.us`;
    }
    
    return formatted;
  }

  /**
   * Health check
   */
  async healthCheck(sessionName: string): Promise<boolean> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        return false;
      }
      
      return await client.isConnected();
    } catch (error) {
      this.logger.error(`WPPConnect health check failed: ${error.message}`);
      return false;
    }
  }
}
