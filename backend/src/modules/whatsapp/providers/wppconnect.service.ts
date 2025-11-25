import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as wppconnect from '@wppconnect-team/wppconnect';
import * as fs from 'fs';
import * as path from 'path';
import { WhatsappNumber } from '../entities/whatsapp-number.entity';

@Injectable()
export class WppConnectService implements OnModuleInit {
  private readonly logger = new Logger(WppConnectService.name);
  private clients: Map<string, any> = new Map();
  private readonly secretKey: string;
  private restoringSessionsInProgress = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(WhatsappNumber)
    private readonly whatsappNumberRepository: Repository<WhatsappNumber>,
  ) {
    this.secretKey = this.configService.get('WPPCONNECT_SECRET_KEY', 'default-secret');
  }

  /**
   * Hook de inicialización del módulo
   * Se ejecuta automáticamente al iniciar la aplicación
   */
  async onModuleInit() {
    this.logger.log('🔄 Iniciando restauración automática de sesiones WPPConnect...');
    await this.restoreAllSessions();
  }

  /**
   * Restaurar todas las sesiones guardadas
   */
  private async restoreAllSessions() {
    if (this.restoringSessionsInProgress) {
      this.logger.warn('⚠️ Ya hay una restauración de sesiones en progreso');
      return;
    }

    this.restoringSessionsInProgress = true;

    try {
      // Obtener números de WhatsApp activos con WPPConnect
      const numbers = await this.whatsappNumberRepository.find({
        where: { 
          isActive: true,
          provider: 'wppconnect' as any,
        },
      });

      if (numbers.length === 0) {
        this.logger.log('ℹ️ No hay números WPPConnect activos para restaurar');
        this.restoringSessionsInProgress = false;
        return;
      }

      this.logger.log(`📱 Encontrados ${numbers.length} números WPPConnect para restaurar`);

      // Verificar carpeta de tokens
      const tokensPath = path.join(process.cwd(), 'tokens');
      if (!fs.existsSync(tokensPath)) {
        this.logger.warn('⚠️ No existe carpeta de tokens. Las sesiones no se pueden restaurar.');
        this.restoringSessionsInProgress = false;
        return;
      }

      // Restaurar cada sesión
      for (const number of numbers) {
        const sessionName = number.phoneNumber;
        const sessionPath = path.join(tokensPath, sessionName);

        // Verificar si existe el token guardado
        if (fs.existsSync(sessionPath)) {
          this.logger.log(`🔄 Restaurando sesión: ${sessionName}`);
          
          try {
            await this.restoreSession(sessionName, number.id);
          } catch (error) {
            this.logger.error(`❌ Error restaurando sesión ${sessionName}: ${error.message}`);
          }
        } else {
          this.logger.warn(`⚠️ No hay token guardado para ${sessionName}`);
        }

        // Esperar un poco entre restauraciones para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.logger.log('✅ Restauración de sesiones completada');
    } catch (error) {
      this.logger.error(`❌ Error en restauración de sesiones: ${error.message}`, error.stack);
    } finally {
      this.restoringSessionsInProgress = false;
    }
  }

  /**
   * Restaurar una sesión individual
   */
  private async restoreSession(sessionName: string, numberId: string): Promise<void> {
    try {
      // Verificar si ya está conectada
      if (this.clients.has(sessionName)) {
        this.logger.log(`✅ Sesión ${sessionName} ya está activa`);
        return;
      }

      this.logger.log(`🚀 Conectando sesión restaurada: ${sessionName}`);

      const client = await wppconnect.create(
        sessionName,
        undefined, // qrCallback (no necesario para restauración)
        (statusSession, session) => {
          this.logger.log(`📊 Estado de sesión restaurada ${session}: ${statusSession}`);
          
          this.eventEmitter.emit('whatsapp.session.status', {
            sessionName: session,
            status: statusSession,
          });

          if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
            this.logger.log(`✅ Sesión ${session} restaurada y autenticada`);
          }
        },
        undefined,
        undefined,
        {
          headless: true,
          devtools: false,
          useChrome: true,
          debug: false,
          logQR: false,
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
          autoClose: 180000,
          disableWelcome: true,
          puppeteerOptions: {
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--window-size=1920,1080',
            ],
          },
        },
      );

      // Configurar listeners ANTES de guardar (crítico para recibir mensajes)
      this.setupEventListeners(client, sessionName);
      this.logger.log(`👂 Listeners configurados para: ${sessionName}`);

      // Guardar cliente en memoria DESPUÉS de configurar listeners
      this.clients.set(sessionName, client);
      this.logger.log(`💾 Cliente guardado en memoria: ${sessionName}`);

      this.logger.log(`✅ Sesión ${sessionName} restaurada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error restaurando sesión ${sessionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Iniciar sesión de WhatsApp
   */
  async startSession(sessionName: string, numberId?: string): Promise<{ qrCode?: string; status: string }> {
    try {
      this.logger.log(`🚀 Iniciando sesión WPPConnect para: ${sessionName} (ID: ${numberId})`);

      if (this.clients.has(sessionName)) {
        this.logger.warn(`⚠️ Sesión ${sessionName} ya existe y está conectada`);
        return { status: 'already-connected' };
      }

      let qrCodeData: string;
      let qrGenerated = false;
      let clientInstance: any;

      this.logger.log(`📱 Creando instancia de WPPConnect...`);

      const client = await wppconnect.create(
        sessionName,
        (base64Qr, asciiQR) => {
          qrCodeData = base64Qr;
          qrGenerated = true;
          this.logger.log(`✅ QR Code generado para sesión ${sessionName} (${base64Qr.length} caracteres)`);
          
          // Emitir evento con QR Code incluyendo numberId
          this.eventEmitter.emit('whatsapp.qrcode.generated', {
            numberId: numberId,
            sessionName,
            qrCode: base64Qr,
          });
        },
        (statusSession, session) => {
          this.logger.log(`📊 Estado de sesión ${session}: ${statusSession}`);
          
          this.eventEmitter.emit('whatsapp.session.status', {
            sessionName: session,
            status: statusSession,
          });

          if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
            this.logger.log(`✅ Sesión ${session} autenticada exitosamente`);
            
            // Usar setTimeout para asegurar que el cliente esté completamente inicializado
            setTimeout(() => {
              if (clientInstance) {
                this.clients.set(sessionName, clientInstance);
                this.setupEventListeners(clientInstance, sessionName);
              }
            }, 500);
          }
        },
        undefined, // onLoadingScreen
        undefined, // catchLinkCode
        {
          headless: true,
          devtools: false,
          useChrome: true,
          debug: false,
          logQR: true,
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
          autoClose: 180000,
          disableWelcome: true,
          puppeteerOptions: {
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--window-size=1920,1080',
            ],
          },
        },
      );

      // Guardar la instancia del cliente
      clientInstance = client;

      this.logger.log(`🎯 Cliente WPPConnect creado`);

      // Esperar un momento para que se genere el QR
      if (!qrGenerated) {
        this.logger.log(`⏳ Esperando generación de QR Code...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      if (qrCodeData) {
        this.logger.log(`✅ Retornando QR Code generado`);
        return { qrCode: qrCodeData, status: 'qr-generated' };
      }

      this.logger.log(`✅ Sesión ya autenticada`);
      return { status: 'authenticated' };
    } catch (error) {
      this.logger.error(`❌ Error starting WPPConnect session: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to start WPPConnect session: ${error.message}`);
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
      this.logger.log(`📤 Intentando enviar mensaje - Session: ${sessionName}, To: ${to}`);
      
      const client = this.clients.get(sessionName);
      if (!client) {
        this.logger.error(`❌ Sesión ${sessionName} no encontrada. Sesiones disponibles: ${Array.from(this.clients.keys()).join(', ')}`);
        throw new BadRequestException(`Session ${sessionName} not found or not authenticated`);
      }

      this.logger.log(`✅ Cliente WPPConnect encontrado para sesión: ${sessionName}`);

      // Asegurar formato de número
      const formattedNumber = this.formatNumber(to);
      this.logger.log(`📱 Número formateado: ${formattedNumber}`);
      
      const result = await client.sendText(formattedNumber, text);
      this.logger.log(`✅ Mensaje enviado exitosamente a ${to} via WPPConnect`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje via WPPConnect: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to send message via WPPConnect: ${error.message}`);
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
