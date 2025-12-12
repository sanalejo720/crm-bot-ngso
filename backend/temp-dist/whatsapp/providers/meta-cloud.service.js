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
var MetaCloudService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaCloudService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const event_emitter_1 = require("@nestjs/event-emitter");
let MetaCloudService = MetaCloudService_1 = class MetaCloudService {
    constructor(configService, eventEmitter) {
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(MetaCloudService_1.name);
        this.accessToken = this.configService.get('META_WHATSAPP_TOKEN');
        this.phoneNumberId = this.configService.get('META_WHATSAPP_PHONE_NUMBER_ID');
        this.version = this.configService.get('META_WHATSAPP_VERSION', 'v18.0');
        this.apiUrl = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}`;
        if (!this.accessToken || !this.phoneNumberId) {
            this.logger.warn('Meta WhatsApp credentials not configured');
        }
    }
    /**
     * Enviar mensaje de texto
     */
    async sendTextMessage(to, text) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text },
            };
            const response = await axios_1.default.post(`${this.apiUrl}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Message sent to ${to} via Meta Cloud API`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Error sending message via Meta: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to send message via Meta Cloud API');
        }
    }
    /**
     * Enviar imagen
     */
    async sendImageMessage(to, imageUrl, caption) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'image',
                image: { link: imageUrl, caption },
            };
            const response = await axios_1.default.post(`${this.apiUrl}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Image message sent to ${to} via Meta Cloud API`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Error sending image via Meta: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to send image via Meta Cloud API');
        }
    }
    /**
     * Enviar documento
     */
    async sendDocumentMessage(to, documentUrl, filename) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'document',
                document: { link: documentUrl, filename },
            };
            const response = await axios_1.default.post(`${this.apiUrl}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Document sent to ${to} via Meta Cloud API`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Error sending document via Meta: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to send document via Meta Cloud API');
        }
    }
    /**
     * Enviar mensaje de texto con credenciales específicas
     */
    async sendTextMessageWithCredentials(phoneNumberId, accessToken, to, text) {
        try {
            const apiUrl = `https://graph.facebook.com/${this.version}/${phoneNumberId}`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text },
            };
            this.logger.log(`📤 Enviando mensaje a ${to} vía Meta Cloud API`);
            this.logger.log(`📱 Phone Number ID: ${phoneNumberId}`);
            this.logger.log(`💬 Contenido: ${text.substring(0, 50)}...`);
            const response = await axios_1.default.post(`${apiUrl}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`✅ Mensaje enviado exitosamente a ${to}`);
            this.logger.log(`📨 Message ID: ${response.data.messages[0].id}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`❌ Error enviando mensaje via Meta: ${error.message}`);
            if (error.response) {
                this.logger.error(`📋 Respuesta de Meta: ${JSON.stringify(error.response.data)}`);
            }
            throw new common_1.BadRequestException(`Failed to send message via Meta Cloud API: ${error.message}`);
        }
    }
    /**
     * Enviar imagen con credenciales específicas
     */
    async sendImageMessageWithCredentials(phoneNumberId, accessToken, to, imageUrl, caption) {
        try {
            const apiUrl = `https://graph.facebook.com/${this.version}/${phoneNumberId}`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'image',
                image: { link: imageUrl, caption },
            };
            this.logger.log(`📤 Enviando imagen a ${to} vía Meta Cloud API`);
            const response = await axios_1.default.post(`${apiUrl}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`✅ Imagen enviada exitosamente a ${to}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`❌ Error enviando imagen via Meta: ${error.message}`);
            if (error.response) {
                this.logger.error(`📋 Respuesta de Meta: ${JSON.stringify(error.response.data)}`);
            }
            throw new common_1.BadRequestException(`Failed to send image via Meta Cloud API: ${error.message}`);
        }
    }
    /**
     * Procesar webhook entrante de Meta
     */
    async processWebhook(payload) {
        try {
            const entry = payload.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            if (!value) {
                return;
            }
            // Procesar mensajes entrantes
            if (value.messages) {
                for (const message of value.messages) {
                    await this.processIncomingMessage(message, value);
                }
            }
            // Procesar cambios de estado
            if (value.statuses) {
                for (const status of value.statuses) {
                    await this.processMessageStatus(status);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error processing Meta webhook: ${error.message}`, error.stack);
        }
    }
    /**
     * Procesar mensaje entrante
     */
    async processIncomingMessage(message, value) {
        const from = message.from;
        const messageId = message.id;
        const timestamp = message.timestamp;
        let content = '';
        let type = 'text';
        if (message.type === 'text') {
            content = message.text.body;
        }
        else if (message.type === 'image') {
            content = message.image.id;
            type = 'image';
        }
        else if (message.type === 'document') {
            content = message.document.id;
            type = 'document';
        }
        // Emitir evento para que otros servicios procesen
        this.eventEmitter.emit('whatsapp.message.received', {
            provider: 'meta',
            from,
            content,
            type,
            messageId,
            timestamp: new Date(parseInt(timestamp) * 1000),
            phoneNumberId: value.metadata.phone_number_id,
        });
        this.logger.log(`Received message from ${from}: ${content}`);
    }
    /**
     * Procesar estado de mensaje
     */
    async processMessageStatus(status) {
        const messageId = status.id;
        const newStatus = status.status; // sent, delivered, read, failed
        this.eventEmitter.emit('whatsapp.message.status', {
            provider: 'meta',
            messageId,
            status: newStatus,
            timestamp: new Date(parseInt(status.timestamp) * 1000),
        });
        this.logger.log(`Message ${messageId} status updated to ${newStatus}`);
    }
    /**
     * Marcar mensaje como leído
     */
    async markAsRead(messageId) {
        try {
            await axios_1.default.post(`${this.apiUrl}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Message ${messageId} marked as read`);
        }
        catch (error) {
            this.logger.error(`Error marking message as read: ${error.message}`);
        }
    }
    /**
     * Verificar salud de la conexión
     */
    async healthCheck() {
        try {
            await axios_1.default.get(`https://graph.facebook.com/${this.version}/${this.phoneNumberId}`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            return true;
        }
        catch (error) {
            this.logger.error(`Meta Cloud API health check failed: ${error.message}`);
            return false;
        }
    }
};
exports.MetaCloudService = MetaCloudService;
exports.MetaCloudService = MetaCloudService = MetaCloudService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], MetaCloudService);
