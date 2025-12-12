"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const whatsapp_number_entity_1 = require("./entities/whatsapp-number.entity");
const meta_cloud_service_1 = require("./providers/meta-cloud.service");
const wppconnect_service_1 = require("./providers/wppconnect.service");
const twilio_service_1 = require("./providers/twilio.service");
const message_entity_1 = require("../messages/entities/message.entity");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor(whatsappNumberRepository, metaCloudService, wppConnectService, twilioService, eventEmitter) {
        this.whatsappNumberRepository = whatsappNumberRepository;
        this.metaCloudService = metaCloudService;
        this.wppConnectService = wppConnectService;
        this.twilioService = twilioService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(WhatsappService_1.name);
    }
    /**
     * Obtener número de WhatsApp por ID
     */
    async findOne(id) {
        const number = await this.whatsappNumberRepository.findOne({
            where: { id },
            relations: ['campaign'],
        });
        if (!number) {
            throw new common_1.NotFoundException(`Número WhatsApp con ID ${id} no encontrado`);
        }
        return number;
    }
    /**
     * Enviar mensaje a través del proveedor correspondiente
     */
    async sendMessage(whatsappNumberId, to, content, type, mediaUrl) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        if (!whatsappNumber.isActive) {
            throw new common_1.BadRequestException('Número WhatsApp inactivo');
        }
        if (whatsappNumber.status !== whatsapp_number_entity_1.ConnectionStatus.CONNECTED) {
            throw new common_1.BadRequestException('Número WhatsApp no conectado');
        }
        try {
            if (whatsappNumber.provider === whatsapp_number_entity_1.WhatsappProvider.META_CLOUD) {
                return await this.sendViaMeta(whatsappNumber, to, content, type, mediaUrl);
            }
            else if (whatsappNumber.provider === whatsapp_number_entity_1.WhatsappProvider.WPPCONNECT) {
                return await this.sendViaWppConnect(whatsappNumber, to, content, type, mediaUrl);
            }
            else if (whatsappNumber.provider === whatsapp_number_entity_1.WhatsappProvider.TWILIO) {
                return await this.sendViaTwilio(whatsappNumber, to, content, type, mediaUrl);
            }
            throw new common_1.BadRequestException('Proveedor no soportado');
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje desde ${whatsappNumberId}: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Procesar webhook de Meta
     */
    async processMetaWebhook(payload) {
        try {
            await this.metaCloudService.processWebhook(payload);
            this.logger.log('Webhook de Meta procesado correctamente');
        }
        catch (error) {
            this.logger.error(`Error procesando webhook de Meta: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Procesar webhook de Twilio
     */
    async processTwilioWebhook(payload) {
        try {
            await this.twilioService.processWebhook(payload);
            this.logger.log('Webhook de Twilio procesado correctamente');
        }
        catch (error) {
            this.logger.error(`Error procesando webhook de Twilio: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Enviar mensaje a través de Meta Cloud API
     */
    async sendViaMeta(whatsappNumber, to, content, type, mediaUrl) {
        this.logger.log(`📤 Enviando via Meta Cloud - WhatsApp ID: ${whatsappNumber.id}`);
        this.logger.log(`📱 Phone Number ID: ${whatsappNumber.phoneNumberId}`);
        this.logger.log(`👤 Destino: ${to}, Tipo: ${type}`);
        if (type === message_entity_1.MessageType.TEXT) {
            const result = await this.metaCloudService.sendTextMessageWithCredentials(whatsappNumber.phoneNumberId, whatsappNumber.accessToken, to, content);
            return {
                messageId: result.messages[0].id,
                metadata: result,
            };
        }
        else if (type === message_entity_1.MessageType.IMAGE) {
            const result = await this.metaCloudService.sendImageMessageWithCredentials(whatsappNumber.phoneNumberId, whatsappNumber.accessToken, to, mediaUrl, content);
            return {
                messageId: result.messages[0].id,
                metadata: result,
            };
        }
        throw new common_1.BadRequestException(`Tipo de mensaje ${type} no soportado con Meta`);
    }
    /**
     * Enviar mensaje a través de WPPConnect
     */
    async sendViaWppConnect(whatsappNumber, to, content, type, mediaUrl) {
        const sessionName = whatsappNumber.phoneNumber; // Usar número como sessionName
        this.logger.log(`📤 Enviando via WPPConnect - WhatsApp ID: ${whatsappNumber.id}, Phone: ${whatsappNumber.phoneNumber}`);
        this.logger.log(`📱 SessionName: ${sessionName}, Destino: ${to}, Tipo: ${type}`);
        if (type === message_entity_1.MessageType.TEXT) {
            const result = await this.wppConnectService.sendTextMessage(sessionName, to, content);
            return {
                messageId: result.id || `wpp-${Date.now()}`,
                metadata: result,
            };
        }
        else if (type === message_entity_1.MessageType.IMAGE) {
            const result = await this.wppConnectService.sendImageMessage(sessionName, to, mediaUrl, content);
            return {
                messageId: result.id || `wpp-${Date.now()}`,
                metadata: result,
            };
        }
        throw new common_1.BadRequestException(`Tipo de mensaje ${type} no soportado con WPPConnect`);
    }
    /**
     * Enviar mensaje a través de Twilio
     */
    async sendViaTwilio(whatsappNumber, to, content, type, mediaUrl) {
        this.logger.log(`📤 Enviando via Twilio - WhatsApp ID: ${whatsappNumber.id}`);
        this.logger.log(`📱 From: ${whatsappNumber.twilioPhoneNumber}, To: ${to}, Tipo: ${type}`);
        // Inicializar cliente si no existe
        this.twilioService.initializeClient(whatsappNumber.id, whatsappNumber.twilioAccountSid, whatsappNumber.twilioAuthToken);
        if (type === message_entity_1.MessageType.TEXT) {
            return await this.twilioService.sendTextMessage(whatsappNumber.id, whatsappNumber.twilioPhoneNumber, to, content);
        }
        else if (type === message_entity_1.MessageType.IMAGE || type === message_entity_1.MessageType.DOCUMENT) {
            return await this.twilioService.sendMediaMessage(whatsappNumber.id, whatsappNumber.twilioPhoneNumber, to, content, mediaUrl);
        }
        throw new common_1.BadRequestException(`Tipo de mensaje ${type} no soportado con Twilio`);
    }
    /**
     * Iniciar sesión de WPPConnect
     */
    async startWppConnectSession(whatsappNumberId) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        if (whatsappNumber.provider !== whatsapp_number_entity_1.WhatsappProvider.WPPCONNECT) {
            throw new common_1.BadRequestException('Este número no usa WPPConnect');
        }
        const sessionName = whatsappNumber.phoneNumber; // Usar número de teléfono como sessionName
        this.logger.log(`Iniciando sesión WPPConnect: ${sessionName} (ID: ${whatsappNumberId})`);
        try {
            const result = await this.wppConnectService.startSession(sessionName, whatsappNumberId);
            await this.whatsappNumberRepository.update(whatsappNumberId, {
                status: whatsapp_number_entity_1.ConnectionStatus.QR_WAITING,
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
        }
        catch (error) {
            this.logger.error(`Error al iniciar sesión WPPConnect: ${error.message}`, error.stack);
            await this.whatsappNumberRepository.update(whatsappNumberId, {
                status: whatsapp_number_entity_1.ConnectionStatus.ERROR,
            });
            this.logger.error(`Error iniciando sesión WPPConnect: ${error.message}`);
            throw error;
        }
    }
    /**
     * Obtener estado de sesión WPPConnect
     */
    async getWppConnectStatus(whatsappNumberId) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        if (whatsappNumber.provider !== whatsapp_number_entity_1.WhatsappProvider.WPPCONNECT) {
            throw new common_1.BadRequestException('Este número no usa WPPConnect');
        }
        const sessionName = whatsappNumber.sessionName || `session-${whatsappNumberId}`;
        try {
            const status = await this.wppConnectService.getSessionStatus(sessionName);
            // Actualizar estado en base de datos
            const newStatus = status.connected
                ? whatsapp_number_entity_1.ConnectionStatus.CONNECTED
                : whatsapp_number_entity_1.ConnectionStatus.DISCONNECTED;
            if (whatsappNumber.status !== newStatus) {
                await this.whatsappNumberRepository.update(whatsappNumberId, {
                    status: newStatus,
                    lastConnectedAt: newStatus === whatsapp_number_entity_1.ConnectionStatus.CONNECTED ? new Date() : null,
                });
            }
            return status;
        }
        catch (error) {
            this.logger.error(`Error obteniendo estado WPPConnect: ${error.message}`);
            throw error;
        }
    }
    /**
     * Actualizar estado de conexión
     */
    async updateConnectionStatus(whatsappNumberId, status) {
        await this.whatsappNumberRepository.update(whatsappNumberId, {
            status,
            lastConnectedAt: status === whatsapp_number_entity_1.ConnectionStatus.CONNECTED ? new Date() : null,
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
    async findAllActive() {
        return this.whatsappNumberRepository.find({
            where: { isActive: true },
            relations: ['campaign'],
        });
    }
    /**
     * Obtener números por campaña
     */
    async findByCampaign(campaignId) {
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
     */
    async sendButtonsMessage(whatsappNumberId, to, title, description, buttons) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        if (whatsappNumber.provider !== whatsapp_number_entity_1.WhatsappProvider.WPPCONNECT) {
            throw new common_1.BadRequestException('Botones interactivos solo soportados con WPPConnect');
        }
        const sessionName = whatsappNumber.phoneNumber;
        const formattedTo = to.includes('@') ? to : `${to}@c.us`;
        this.logger.log(`📤 Enviando botones via WPPConnect - To: ${formattedTo}`);
        try {
            const result = await this.wppConnectService.sendButtonsMessage(sessionName, formattedTo, title, description, buttons);
            return {
                messageId: result?.id || `wpp-btn-${Date.now()}`,
                metadata: result,
            };
        }
        catch (error) {
            this.logger.error(`Error enviando botones: ${error.message}`);
            throw error;
        }
    }
    /**
     * Enviar lista interactiva
     */
    async sendListMessage(whatsappNumberId, to, title, description, buttonText, sections) {
        const whatsappNumber = await this.findOne(whatsappNumberId);
        if (whatsappNumber.provider !== whatsapp_number_entity_1.WhatsappProvider.WPPCONNECT) {
            throw new common_1.BadRequestException('Listas interactivas solo soportadas con WPPConnect');
        }
        const sessionName = whatsappNumber.phoneNumber;
        const formattedTo = to.includes('@') ? to : `${to}@c.us`;
        this.logger.log(`📤 Enviando lista via WPPConnect - To: ${formattedTo}`);
        try {
            const result = await this.wppConnectService.sendListMessage(sessionName, formattedTo, title, description, buttonText, sections);
            return {
                messageId: result?.id || `wpp-list-${Date.now()}`,
                metadata: result,
            };
        }
        catch (error) {
            this.logger.error(`Error enviando lista: ${error.message}`);
            throw error;
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_number_entity_1.WhatsappNumber)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        meta_cloud_service_1.MetaCloudService,
        wppconnect_service_1.WppConnectService,
        twilio_service_1.TwilioService,
        event_emitter_1.EventEmitter2])
], WhatsappService);
