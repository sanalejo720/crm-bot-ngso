"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WppConnectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WppConnectService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wppconnect = __importStar(require("@wppconnect-team/wppconnect"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const whatsapp_number_entity_1 = require("../entities/whatsapp-number.entity");
let WppConnectService = WppConnectService_1 = class WppConnectService {
    constructor(configService, eventEmitter, whatsappNumberRepository) {
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.whatsappNumberRepository = whatsappNumberRepository;
        this.logger = new common_1.Logger(WppConnectService_1.name);
        this.clients = new Map();
        this.restoringSessionsInProgress = false;
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
    async restoreAllSessions() {
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
                    provider: 'wppconnect',
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
                    }
                    catch (error) {
                        this.logger.error(`❌ Error restaurando sesión ${sessionName}: ${error.message}`);
                    }
                }
                else {
                    this.logger.warn(`⚠️ No hay token guardado para ${sessionName}`);
                }
                // Esperar un poco entre restauraciones para no sobrecargar
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            this.logger.log('✅ Restauración de sesiones completada');
        }
        catch (error) {
            this.logger.error(`❌ Error en restauración de sesiones: ${error.message}`, error.stack);
        }
        finally {
            this.restoringSessionsInProgress = false;
        }
    }
    /**
     * Restaurar una sesión individual
     */
    async restoreSession(sessionName, numberId) {
        try {
            // Limpiar procesos zombies ANTES de verificar si existe
            await this.killZombieProcesses(sessionName);
            // Verificar si ya está conectada
            if (this.clients.has(sessionName)) {
                this.logger.log(`✅ Sesión ${sessionName} ya está activa en memoria. Removiendo...`);
                this.clients.delete(sessionName);
            }
            this.logger.log(`🚀 Conectando sesión restaurada: ${sessionName}`);
            const client = await wppconnect.create(sessionName, undefined, // qrCallback (no necesario para restauración)
            (statusSession, session) => {
                this.logger.log(`📊 Estado de sesión restaurada ${session}: ${statusSession}`);
                this.eventEmitter.emit('whatsapp.session.status', {
                    sessionName: session,
                    status: statusSession,
                });
                if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
                    this.logger.log(`✅ Sesión ${session} restaurada y autenticada`);
                }
            }, undefined, undefined, {
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
                    executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
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
            });
            // Configurar listeners ANTES de guardar (crítico para recibir mensajes)
            this.setupEventListeners(client, sessionName);
            this.logger.log(`👂 Listeners configurados para: ${sessionName}`);
            // Guardar cliente en memoria DESPUÉS de configurar listeners
            this.clients.set(sessionName, client);
            this.logger.log(`💾 Cliente guardado en memoria: ${sessionName}`);
            this.logger.log(`✅ Sesión ${sessionName} restaurada exitosamente`);
        }
        catch (error) {
            this.logger.error(`❌ Error restaurando sesión ${sessionName}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Matar procesos zombies de Chromium para una sesión específica
     */
    async killZombieProcesses(sessionName) {
        const execPromise = (0, util_1.promisify)(child_process_1.exec);
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
                }
                catch (error) {
                    // pkill retorna error si no encuentra procesos, esto es normal
                    if (!error.message.includes('Command failed')) {
                        this.logger.warn(`⚠️ Error ejecutando ${cmd}: ${error.message}`);
                    }
                }
            }
            // Esperar un momento para que los procesos terminen
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.logger.log(`✅ Limpieza de procesos completada para: ${sessionName}`);
        }
        catch (error) {
            this.logger.error(`❌ Error matando procesos zombies: ${error.message}`);
            // No lanzar error, continuar con el inicio de sesión
        }
    }
    /**
     * Iniciar sesión de WhatsApp
     */
    async startSession(sessionName, numberId) {
        try {
            this.logger.log(`🚀 Iniciando sesión WPPConnect para: ${sessionName} (ID: ${numberId})`);
            // CRÍTICO: Matar procesos zombies ANTES de verificar si existe el cliente
            await this.killZombieProcesses(sessionName);
            if (this.clients.has(sessionName)) {
                this.logger.warn(`⚠️ Sesión ${sessionName} ya existe en memoria. Removiendo...`);
                // Remover cliente viejo de memoria
                this.clients.delete(sessionName);
            }
            let qrCodeData;
            let qrGenerated = false;
            let clientInstance;
            this.logger.log(`📱 Creando instancia de WPPConnect...`);
            const client = await wppconnect.create(sessionName, (base64Qr, asciiQR) => {
                qrCodeData = base64Qr;
                qrGenerated = true;
                this.logger.log(`✅ QR Code generado para sesión ${sessionName} (${base64Qr.length} caracteres)`);
                // Emitir evento con QR Code incluyendo numberId
                this.eventEmitter.emit('whatsapp.qrcode.generated', {
                    numberId: numberId,
                    sessionName,
                    qrCode: base64Qr,
                });
            }, (statusSession, session) => {
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
            }, undefined, // onLoadingScreen
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
                    executablePath: process.env.CHROME_BIN || '/snap/bin/chromium',
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
            });
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
        }
        catch (error) {
            this.logger.error(`❌ Error starting WPPConnect session: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to start WPPConnect session: ${error.message}`);
        }
    }
    /**
     * Configurar listeners de eventos
     */
    setupEventListeners(client, sessionName) {
        this.logger.log(`🎧 Configurando listener onMessage para ${sessionName}`);
        // Mensajes entrantes
        client.onMessage(async (message) => {
            this.logger.log(`📨 ¡MENSAJE RECIBIDO! - From: ${message.from}, Type: ${message.type}, Body: ${message.body?.substring(0, 50)}`);
            try {
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
                            }
                            else if (typeof mediaData === 'string') {
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
                    }
                    catch (mediaError) {
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
            }
            catch (error) {
                this.logger.error(`❌ Error procesando mensaje entrante: ${error.message}`, error.stack);
            }
        });
        this.logger.log(`✅ Listener onMessage configurado exitosamente para ${sessionName}`);
        // Estado de conexión
        client.onStateChange((state) => {
            this.logger.log(`WPPConnect session ${sessionName} state: ${state}`);
            if (state === 'CONFLICT' || state === 'UNPAIRED') {
                this.clients.delete(sessionName);
            }
        });
    }
    /**
     * Enviar mensaje de texto
     */
    async sendTextMessage(sessionName, to, text) {
        try {
            this.logger.log(`📤 Intentando enviar mensaje - Session: ${sessionName}, To: ${to}`);
            const client = this.clients.get(sessionName);
            if (!client) {
                this.logger.error(`❌ Sesión ${sessionName} no encontrada. Sesiones disponibles: ${Array.from(this.clients.keys()).join(', ')}`);
                throw new common_1.BadRequestException(`Session ${sessionName} not found or not authenticated`);
            }
            this.logger.log(`✅ Cliente WPPConnect encontrado para sesión: ${sessionName}`);
            // Asegurar formato de número
            const formattedNumber = this.formatNumber(to);
            this.logger.log(`📱 Número formateado: ${formattedNumber}`);
            const result = await client.sendText(formattedNumber, text);
            this.logger.log(`✅ Mensaje enviado exitosamente a ${to} via WPPConnect`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Error enviando mensaje via WPPConnect: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to send message via WPPConnect: ${error.message}`);
        }
    }
    /**
     * Enviar imagen
     */
    async sendImageMessage(sessionName, to, imageUrl, caption) {
        try {
            const client = this.clients.get(sessionName);
            if (!client) {
                throw new common_1.BadRequestException(`Session ${sessionName} not found`);
            }
            const formattedNumber = this.formatNumber(to);
            const result = await client.sendImage(formattedNumber, imageUrl, 'image', caption);
            this.logger.log(`Image sent to ${to} via WPPConnect`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error sending image via WPPConnect: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to send image via WPPConnect');
        }
    }
    /**
     * Enviar archivo
     */
    async sendFileMessage(sessionName, to, fileUrl, filename) {
        try {
            const client = this.clients.get(sessionName);
            if (!client) {
                throw new common_1.BadRequestException(`Session ${sessionName} not found`);
            }
            const formattedNumber = this.formatNumber(to);
            const result = await client.sendFile(formattedNumber, fileUrl, filename || 'file', '');
            this.logger.log(`File sent to ${to} via WPPConnect`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error sending file via WPPConnect: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to send file via WPPConnect');
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
    async sendButtonsMessage(sessionName, to, title, description, buttons) {
        try {
            const client = this.clients.get(sessionName);
            if (!client) {
                throw new common_1.BadRequestException(`Session ${sessionName} not found`);
            }
            const formattedNumber = this.formatNumber(to);
            // Formatear botones para WPPConnect
            const formattedButtons = buttons.map(btn => ({
                id: btn.id,
                text: btn.text,
            }));
            this.logger.log(`📤 Enviando mensaje con ${buttons.length} botones a ${to}`);
            // WPPConnect usa sendButtons
            const result = await client.sendButtons(formattedNumber, title, formattedButtons, description);
            this.logger.log(`✅ Mensaje con botones enviado a ${to}`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Error enviando botones: ${error.message}`, error.stack);
            // Fallback: enviar como texto con opciones numeradas
            this.logger.log(`⚠️ Intentando fallback con mensaje de texto...`);
            return this.sendButtonsAsFallbackText(sessionName, to, title, description, buttons);
        }
    }
    /**
     * Fallback: Enviar botones como texto con opciones numeradas
     */
    async sendButtonsAsFallbackText(sessionName, to, title, description, buttons) {
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
    async sendListMessage(sessionName, to, title, subtitle, description, buttonText, sections) {
        try {
            const client = this.clients.get(sessionName);
            if (!client) {
                throw new common_1.BadRequestException(`Session ${sessionName} not found`);
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
        }
        catch (error) {
            this.logger.error(`❌ Error enviando lista: ${error.message}`, error.stack);
            // Fallback: enviar como texto
            return this.sendListAsFallbackText(sessionName, to, title, description, sections);
        }
    }
    /**
     * Fallback: Enviar lista como texto
     */
    async sendListAsFallbackText(sessionName, to, title, description, sections) {
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
    async closeSession(sessionName) {
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
        }
        catch (error) {
            this.logger.error(`❌ Error closing session: ${error.message}`);
            // Intentar limpiar procesos de todas formas
            await this.killZombieProcesses(sessionName);
        }
    }
    /**
     * Verificar estado de sesión
     */
    async getSessionStatus(sessionName) {
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
        }
        catch (error) {
            this.logger.error(`Error getting session status: ${error.message}`);
            return { connected: false };
        }
    }
    /**
     * Obtener todas las sesiones activas
     */
    getActiveSessions() {
        return Array.from(this.clients.keys());
    }
    /**
     * Formatear número de teléfono
     */
    formatNumber(number) {
        this.logger.log(`🔧 Formateando número: ${number}`);
        // Si ya tiene sufijos de WhatsApp, retornar tal cual
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
        // Agregar @c.us
        formatted = `${formatted}@c.us`;
        this.logger.log(`✅ Número formateado: ${formatted}`);
        return formatted;
    }
    /**
     * Health check
     */
    async healthCheck(sessionName) {
        try {
            const client = this.clients.get(sessionName);
            if (!client) {
                return false;
            }
            return await client.isConnected();
        }
        catch (error) {
            this.logger.error(`WPPConnect health check failed: ${error.message}`);
            return false;
        }
    }
    /**
     * Obtener extensión de archivo según mime type
     */
    getExtensionFromMimeType(mimeType) {
        const mimeMap = {
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
};
exports.WppConnectService = WppConnectService;
exports.WppConnectService = WppConnectService = WppConnectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_number_entity_1.WhatsappNumber)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        event_emitter_1.EventEmitter2,
        typeorm_2.Repository])
], WppConnectService);
