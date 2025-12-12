import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as wppconnect from '@wppconnect-team/wppconnect';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WhatsappNumber, ConnectionStatus } from '../entities/whatsapp-number.entity';

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
    // Restaurar sesiones automáticamente al iniciar
    this.logger.log('🔄 Iniciando restauración automática de sesiones WPPConnect');
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
      // Limpiar procesos zombies ANTES de verificar si existe
      await this.killZombieProcesses(sessionName);

      // Verificar si ya está conectada
      if (this.clients.has(sessionName)) {
        this.logger.log(`✅ Sesión ${sessionName} ya está activa en memoria. Removiendo...`);
        this.clients.delete(sessionName);
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
          folderNameToken: 'tokens', // CRÍTICO: carpeta donde se guardan/leen las sesiones
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
            executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
            userDataDir: path.join(process.cwd(), 'tokens', sessionName), // CRÍTICO: carpeta única por sesión
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--single-process', // Ayuda con múltiples instancias
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
   * Matar procesos zombies de Chromium para una sesión específica
   */
  private async killZombieProcesses(sessionName: string): Promise<void> {
    const execPromise = promisify(exec);
    
    try {
      this.logger.log(`🔪 Verificando procesos zombies para: ${sessionName}`);
      
      // Construir el path del userDataDir
      const tokensPath = path.join(process.cwd(), 'tokens', sessionName);
      
      // Matar procesos de Chromium/Chrome que usen ese userDataDir
      const commands = [
        // Linux: buscar y matar procesos chromium con ese path
        `pkill -9 -f "${tokensPath}"`,
        // También intentar con chromium genérico
        `pkill -9 -f "chromium.*${sessionName}"`,
      ];
      
      for (const cmd of commands) {
        try {
          await execPromise(cmd);
          this.logger.log(`✅ Ejecutado: ${cmd}`);
        } catch (error) {
          // pkill retorna error si no encuentra procesos, esto es normal
          if (!error.message.includes('Command failed')) {
            this.logger.warn(`⚠️ Error ejecutando ${cmd}: ${error.message}`);
          }
        }
      }
      
      // Esperar un momento para que los procesos terminen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.logger.log(`✅ Limpieza de procesos completada para: ${sessionName}`);
    } catch (error) {
      this.logger.error(`❌ Error matando procesos zombies: ${error.message}`);
      // No lanzar error, continuar con el inicio de sesión
    }
  }

  /**
   * Iniciar sesión de WhatsApp
   */
  async startSession(sessionName: string, numberId?: string): Promise<{ qrCode?: string; status: string }> {
    try {
      this.logger.log(`🚀 Iniciando sesión WPPConnect para: ${sessionName} (ID: ${numberId})`);

      // CRÍTICO: Matar procesos zombies ANTES de verificar si existe el cliente
      await this.killZombieProcesses(sessionName);

      if (this.clients.has(sessionName)) {
        this.logger.warn(`⚠️ Sesión ${sessionName} ya existe en memoria. Cerrando cliente anterior...`);
        try {
          const oldClient = this.clients.get(sessionName);
          if (oldClient) {
            await oldClient.close();
            this.logger.log(`✅ Cliente anterior cerrado correctamente`);
          }
        } catch (closeError) {
          this.logger.warn(`⚠️ Error cerrando cliente anterior: ${closeError.message}`);
        }
        // Remover cliente viejo de memoria
        this.clients.delete(sessionName);
        // Esperar un poco para asegurar que se liberaron recursos
        await new Promise(resolve => setTimeout(resolve, 2000));
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
          folderNameToken: 'tokens', // CRÍTICO: carpeta donde se guardan/leen las sesiones
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
            executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
            userDataDir: path.join(process.cwd(), 'tokens', sessionName), // CRÍTICO: carpeta única por sesión
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--single-process', // Ayuda con múltiples instancias
              '--window-size=1920,1080',
            ],
          },
        },
      );

      // Guardar la instancia del cliente
      clientInstance = client;

      this.logger.log(`🎯 Cliente WPPConnect creado`);
      
      // IMPORTANTE: Registrar listeners INMEDIATAMENTE para capturar todos los mensajes
      this.logger.log(`🔧 Registrando listeners para sesión ${sessionName}`);
      this.clients.set(sessionName, clientInstance);
      this.setupEventListeners(clientInstance, sessionName);
      this.logger.log(`✅ Listeners registrados exitosamente`);

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
    this.logger.log(`🎧 Configurando listener onMessage para ${sessionName}`);
    
    // Mensajes entrantes
    client.onMessage(async (message: any) => {
      this.logger.log(`📨 ¡MENSAJE RECIBIDO! - From: ${message.from}, Type: ${message.type}, Body: ${message.body?.substring(0, 50)}`);
      
      try {
        // FILTRAR: Ignorar estados de WhatsApp (status@broadcast)
        if (message.from === 'status@broadcast' || message.isStatusV3 || message.type === 'status') {
          this.logger.log(`⏭️ Ignorando estado/historia de WhatsApp de ${message.from}`);
          return;
        }

        // FILTRAR: Ignorar mensajes de grupos si no los necesitamos
        if (message.from.includes('@g.us')) {
          this.logger.log(`⏭️ Ignorando mensaje de grupo: ${message.from}`);
          return;
        }

        // FILTRAR: Detectar y advertir sobre Lead IDs de Facebook
        // Los Lead IDs tienen formato largo (15+ dígitos) con @lid
        if (message.from.includes('@lid')) {
          this.logger.warn(`⚠️ Mensaje de Lead ID de Facebook detectado: ${message.from}. Este contacto NO puede recibir respuestas vía WPPConnect, solo con Meta Cloud API.`);
          // Continuamos procesando para registrar el mensaje, pero el bot no podrá responder
        }

        let content = message.body || '';
        let mediaUrl = null;
        let fileName = null;
        let mimeType = null;

        // Procesar multimedia (imagen, audio, video, documento)
        if (message.type !== 'chat' && message.type !== 'text') {
          this.logger.log(`📎 Mensaje multimedia detectado - Tipo: ${message.type}`);
          
          try {
            // Descargar media usando WPPConnect
            const mediaData = await client.decryptFile(message);
            
            if (mediaData) {
              // mediaData es un buffer o base64
              const fs = require('fs');
              const path = require('path');
              
              // Crear directorio uploads si no existe
              const uploadsDir = path.join(process.cwd(), 'uploads', 'media');
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              // Generar nombre de archivo único
              const ext = this.getExtensionFromMimeType(message.mimetype);
              fileName = `${Date.now()}_${message.id.substring(0, 10)}.${ext}`;
              const filePath = path.join(uploadsDir, fileName);
              
              // Guardar archivo
              if (Buffer.isBuffer(mediaData)) {
                fs.writeFileSync(filePath, mediaData);
              } else if (typeof mediaData === 'string') {
                // Si es base64
                const base64Data = mediaData.replace(/^data:.+;base64,/, '');
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              }
              
              // URL pública del archivo
              mediaUrl = `/uploads/media/${fileName}`;
              mimeType = message.mimetype;
              content = message.caption || `[${message.type.toUpperCase()}]`;
              
              this.logger.log(`✅ Media guardado - Archivo: ${fileName}, Tipo: ${message.type}`);
            }
          } catch (mediaError) {
            this.logger.error(`❌ Error descargando media: ${mediaError.message}`);
            content = `[${message.type.toUpperCase()} - Error al descargar]`;
          }
        }

        this.eventEmitter.emit('whatsapp.message.received', {
          provider: 'wppconnect',
          from: message.from,
          content,
          type: message.type,
          messageId: message.id,
          timestamp: new Date(message.timestamp * 1000),
          sessionName,
          // Datos de multimedia
          mediaUrl,
          fileName,
          mimeType,
          isMedia: message.type !== 'chat' && message.type !== 'text',
        });

        this.logger.log(`✅ Mensaje procesado y emitido correctamente`);
      } catch (error) {
        this.logger.error(`❌ Error procesando mensaje entrante: ${error.message}`, error.stack);
      }
    });

    this.logger.log(`✅ Listener onMessage configurado exitosamente para ${sessionName}`);

    // Estado de conexión - MEJORADO para detectar desconexiones
    client.onStateChange(async (state: string) => {
      this.logger.log(`📡 WPPConnect session ${sessionName} cambió de estado: ${state}`);
      
      // Emitir evento de cambio de estado
      this.eventEmitter.emit('whatsapp.session.status', {
        sessionName,
        status: state,
      });

      // Detectar desconexión
      if (state === 'CONFLICT' || state === 'UNPAIRED' || state === 'DISCONNECTED') {
        this.logger.warn(`⚠️ Sesión ${sessionName} desconectada (${state}). Limpiando...`);
        this.clients.delete(sessionName);
        
        // Actualizar estado en base de datos
        try {
          const whatsappNumber = await this.whatsappNumberRepository.findOne({
            where: { sessionName },
          });
          
          if (whatsappNumber) {
            whatsappNumber.status = ConnectionStatus.DISCONNECTED;
            whatsappNumber.lastConnectedAt = null;
            await this.whatsappNumberRepository.save(whatsappNumber);
            this.logger.log(`✅ Estado de ${sessionName} actualizado en BD: disconnected`);
          }
        } catch (dbError) {
          this.logger.error(`❌ Error actualizando estado en BD: ${dbError.message}`);
        }
      } else if (state === 'CONNECTED') {
        // Actualizar última conexión exitosa
        try {
          const whatsappNumber = await this.whatsappNumberRepository.findOne({
            where: { sessionName },
          });
          
          if (whatsappNumber) {
            whatsappNumber.status = ConnectionStatus.CONNECTED;
            whatsappNumber.lastConnectedAt = new Date();
            await this.whatsappNumberRepository.save(whatsappNumber);
            this.logger.log(`✅ Estado de ${sessionName} actualizado en BD: connected`);
          }
        } catch (dbError) {
          this.logger.error(`❌ Error actualizando estado en BD: ${dbError.message}`);
        }
      }
    });
  }

  /**
   * Enviar mensaje de texto
   * ACTUALIZADO: Soporta tanto @c.us como @lid (nuevo formato de WhatsApp)
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

      // Determinar el ID de destino
      let targetId: string;
      const phoneNumber = to.replace(/\D/g, '').replace(/@.*$/, '');
      
      // Si ya viene con sufijo de WhatsApp (@lid, @c.us, @s.whatsapp.net), usar directamente
      if (to.includes('@lid') || to.includes('@c.us') || to.includes('@s.whatsapp.net')) {
        targetId = to;
        this.logger.log(`📱 Usando ID de WhatsApp directamente: ${targetId}`);
      } else {
        // Es solo un número, agregar sufijo @c.us
        targetId = `${phoneNumber}@c.us`;
        this.logger.log(`📱 Número formateado a: ${targetId}`);
      }
      
      // Intentar enviar mensaje, con fallback a LID si falla
      try {
        this.logger.log(`📤 Enviando mensaje a: ${targetId}`);
        const result = await client.sendText(targetId, text);
        this.logger.log(`✅ Mensaje enviado exitosamente a ${to} via WPPConnect`);
        return result;
      } catch (sendError) {
        // Si falla con "No LID for user", intentar obtener el LID del contacto
        if (sendError.message && sendError.message.includes('No LID for user')) {
          this.logger.warn(`⚠️ Error LID para ${targetId}, intentando obtener ID correcto...`);
          
          // Estrategia 1: Usar requestPhoneNumber si tenemos un LID
          if (targetId.includes('@lid')) {
            try {
              this.logger.log(`📱 Solicitando número para LID: ${targetId}`);
              const phoneResult = await client.requestPhoneNumber(targetId);
              if (phoneResult) {
                const correctId = phoneResult.to || phoneResult.chatId || phoneResult.id || phoneResult.toId;
                if (correctId) {
                  this.logger.log(`📱 ID obtenido via requestPhoneNumber: ${correctId}`);
                  const result = await client.sendText(correctId, text);
                  this.logger.log(`✅ Mensaje enviado exitosamente usando requestPhoneNumber`);
                  return result;
                }
              }
            } catch (reqError) {
              this.logger.warn(`⚠️ requestPhoneNumber falló: ${reqError.message}`);
            }
          }
          
          // Estrategia 2: Intentar obtener el contacto y su ID serializado
          try {
            const contact = await client.getContact(`${phoneNumber}@c.us`);
            if (contact && contact.id && contact.id._serialized) {
              const correctId = contact.id._serialized;
              this.logger.log(`📱 ID correcto obtenido del contacto: ${correctId}`);
              const result = await client.sendText(correctId, text);
              this.logger.log(`✅ Mensaje enviado exitosamente usando ID del contacto: ${correctId}`);
              return result;
            }
          } catch (contactError) {
            this.logger.warn(`⚠️ No se pudo obtener contacto: ${contactError.message}`);
          }
          
          // Estrategia 3: Usar queryExists para verificar el número
          try {
            this.logger.log(`📱 Verificando número con queryExists: ${phoneNumber}`);
            const exists = await client.checkNumberStatus(`${phoneNumber}@c.us`);
            if (exists && exists.id && exists.id._serialized) {
              const correctId = exists.id._serialized;
              this.logger.log(`📱 ID obtenido via queryExists: ${correctId}`);
              const result = await client.sendText(correctId, text);
              this.logger.log(`✅ Mensaje enviado exitosamente usando queryExists`);
              return result;
            }
          } catch (queryError) {
            this.logger.warn(`⚠️ queryExists falló: ${queryError.message}`);
          }
        }
        
        // Si ningún intento funcionó, propagar el error original
        throw sendError;
      }
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
   * Enviar mensaje con botones interactivos
   * @param sessionName Nombre de la sesión
   * @param to Número destino
   * @param title Título del mensaje
   * @param description Descripción/cuerpo del mensaje
   * @param buttons Array de botones [{id: string, text: string}]
   */
  async sendButtonsMessage(
    sessionName: string,
    to: string,
    title: string,
    description: string,
    buttons: Array<{ id: string; text: string }>,
  ): Promise<any> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new BadRequestException(`Session ${sessionName} not found`);
      }

      const formattedNumber = this.formatNumber(to);
      
      // Formatear botones para WPPConnect
      const formattedButtons = buttons.map(btn => ({
        id: btn.id,
        text: btn.text,
      }));

      this.logger.log(`📤 Enviando mensaje con ${buttons.length} botones a ${to}`);

      // WPPConnect usa sendButtons
      const result = await client.sendButtons(
        formattedNumber,
        title,
        formattedButtons,
        description,
      );

      this.logger.log(`✅ Mensaje con botones enviado a ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error enviando botones: ${error.message}`, error.stack);
      // Fallback: enviar como texto con opciones numeradas
      this.logger.log(`⚠️ Intentando fallback con mensaje de texto...`);
      return this.sendButtonsAsFallbackText(sessionName, to, title, description, buttons);
    }
  }

  /**
   * Fallback: Enviar botones como texto con opciones numeradas
   */
  private async sendButtonsAsFallbackText(
    sessionName: string,
    to: string,
    title: string,
    description: string,
    buttons: Array<{ id: string; text: string }>,
  ): Promise<any> {
    const buttonText = buttons.map((btn, idx) => `${idx + 1}. ${btn.text}`).join('\n');
    const fullMessage = `${title}\n\n${description}\n\n${buttonText}`;
    return this.sendTextMessage(sessionName, to, fullMessage);
  }

  /**
   * Enviar lista interactiva (para menús más complejos)
   * @param sessionName Nombre de la sesión
   * @param to Número destino
   * @param title Título
   * @param subtitle Subtítulo
   * @param description Descripción
   * @param buttonText Texto del botón que abre la lista
   * @param sections Secciones con opciones [{title: string, rows: [{id, title, description}]}]
   */
  async sendListMessage(
    sessionName: string,
    to: string,
    title: string,
    subtitle: string,
    description: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
  ): Promise<any> {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new BadRequestException(`Session ${sessionName} not found`);
      }

      const formattedNumber = this.formatNumber(to);

      this.logger.log(`📤 Enviando lista interactiva a ${to}`);

      // WPPConnect usa sendListMessage
      const result = await client.sendListMessage(formattedNumber, {
        buttonText,
        description,
        title,
        footerText: subtitle,
        sections,
      });

      this.logger.log(`✅ Lista interactiva enviada a ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error enviando lista: ${error.message}`, error.stack);
      // Fallback: enviar como texto
      return this.sendListAsFallbackText(sessionName, to, title, description, sections);
    }
  }

  /**
   * Fallback: Enviar lista como texto
   */
  private async sendListAsFallbackText(
    sessionName: string,
    to: string,
    title: string,
    description: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
  ): Promise<any> {
    let optionNumber = 1;
    const sectionsText = sections.map(section => {
      const rowsText = section.rows.map(row => {
        const text = `${optionNumber}. ${row.title}${row.description ? ` - ${row.description}` : ''}`;
        optionNumber++;
        return text;
      }).join('\n');
      return `*${section.title}*\n${rowsText}`;
    }).join('\n\n');

    const fullMessage = `${title}\n\n${description}\n\n${sectionsText}`;
    return this.sendTextMessage(sessionName, to, fullMessage);
  }

  /**
   * Cerrar sesión
   */
  async closeSession(sessionName: string): Promise<void> {
    try {
      const client = this.clients.get(sessionName);
      if (client) {
        this.logger.log(`🔴 Cerrando sesión: ${sessionName}`);
        await client.close();
        this.clients.delete(sessionName);
        this.logger.log(`✅ Sesión ${sessionName} cerrada desde memoria`);
      }
      
      // IMPORTANTE: Matar procesos zombies después de cerrar
      await this.killZombieProcesses(sessionName);
      this.logger.log(`✅ Procesos zombies limpiados para: ${sessionName}`);
    } catch (error) {
      this.logger.error(`❌ Error closing session: ${error.message}`);
      // Intentar limpiar procesos de todas formas
      await this.killZombieProcesses(sessionName);
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
   * MEJORADO: Maneja correctamente números con LID y detecta el formato apropiado
   */
  private formatNumber(number: string): string {
    this.logger.log(`🔧 Formateando número: ${number}`);
    
    // Si ya tiene sufijos de WhatsApp válidos, retornar tal cual
    if (number.includes('@c.us') || number.includes('@lid') || number.includes('@g.us') || number.includes('@s.whatsapp.net')) {
      this.logger.log(`✅ Número ya tiene sufijo WhatsApp válido: ${number}`);
      return number;
    }
    
    // Remover caracteres no numéricos
    let formatted = number.replace(/\D/g, '');
    
    // Verificar que tenga código de país (longitud mínima 10 dígitos)
    if (formatted.length < 10) {
      this.logger.warn(`⚠️ Número muy corto (${formatted.length} dígitos): ${formatted}`);
    }
    
    // Por defecto usar @c.us (formato estándar)
    // WPPConnect maneja automáticamente la conversión a @lid si es necesario
    formatted = `${formatted}@c.us`;
    this.logger.log(`✅ Número formateado: ${formatted}`);
    
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

  /**
   * Obtener extensión de archivo según mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/aac': 'aac',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };

    return mimeMap[mimeType] || 'bin';
  }
}
