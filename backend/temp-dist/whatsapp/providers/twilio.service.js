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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TwilioService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const message_entity_1 = require("../../messages/entities/message.entity");
const twilio_1 = __importDefault(require("twilio"));
let TwilioService = TwilioService_1 = class TwilioService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TwilioService_1.name);
        this.clients = new Map();
    }
    /**
     * Inicializar cliente de Twilio
     */
    initializeClient(whatsappNumberId, accountSid, authToken) {
        try {
            const client = (0, twilio_1.default)(accountSid, authToken);
            this.clients.set(whatsappNumberId, client);
            this.logger.log(`Cliente Twilio inicializado para ${whatsappNumberId}`);
        }
        catch (error) {
            this.logger.error(`Error inicializando Twilio: ${error.message}`);
            throw error;
        }
    }
    /**
     * Obtener cliente de Twilio
     */
    getClient(whatsappNumberId) {
        const client = this.clients.get(whatsappNumberId);
        if (!client) {
            throw new common_1.BadRequestException('Cliente Twilio no inicializado');
        }
        return client;
    }
    /**
     * Enviar mensaje de texto
     */
    async sendTextMessage(whatsappNumberId, from, // Formato: whatsapp:+14155238886
    to, // Formato: whatsapp:+573001234567
    body) {
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
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje Twilio: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Enviar mensaje con media (imagen, documento, etc)
     */
    async sendMediaMessage(whatsappNumberId, from, to, body, mediaUrl) {
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
        }
        catch (error) {
            this.logger.error(`Error enviando media Twilio: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Procesar webhook de Twilio (mensajes entrantes)
     */
    async processWebhook(payload) {
        try {
            this.logger.log('Webhook de Twilio recibido');
            this.logger.debug(JSON.stringify(payload, null, 2));
            const { From: from, // whatsapp:+573001234567
            To: to, // whatsapp:+14155238886
            Body: body, MessageSid: messageSid, MediaUrl0: mediaUrl, NumMedia: numMedia, } = payload;
            // Limpiar formato de número (quitar 'whatsapp:')
            const contactPhone = from.replace('whatsapp:', '');
            const whatsappNumber = to.replace('whatsapp:', '');
            // Emitir evento para que el sistema procese el mensaje
            this.eventEmitter.emit('whatsapp.message.received', {
                provider: 'twilio',
                whatsappNumber,
                contactPhone,
                messageId: messageSid,
                content: body,
                type: numMedia > 0 ? message_entity_1.MessageType.IMAGE : message_entity_1.MessageType.TEXT,
                mediaUrl: numMedia > 0 ? mediaUrl : null,
                timestamp: new Date(),
                metadata: {
                    numMedia,
                },
            });
            this.logger.log(`Mensaje entrante procesado: ${messageSid}`);
        }
        catch (error) {
            this.logger.error(`Error procesando webhook Twilio: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Verificar estado de mensaje
     */
    async getMessageStatus(whatsappNumberId, messageSid) {
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
        }
        catch (error) {
            this.logger.error(`Error obteniendo estado de mensaje: ${error.message}`);
            throw error;
        }
    }
    /**
     * Remover cliente
     */
    removeClient(whatsappNumberId) {
        this.clients.delete(whatsappNumberId);
        this.logger.log(`Cliente Twilio removido: ${whatsappNumberId}`);
    }
};
exports.TwilioService = TwilioService;
exports.TwilioService = TwilioService = TwilioService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], TwilioService);
