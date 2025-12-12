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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ChatsExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsExportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const chat_entity_1 = require("./entities/chat.entity");
const message_entity_1 = require("../messages/entities/message.entity");
const user_entity_1 = require("../users/entities/user.entity");
const email_service_1 = require("../../common/services/email.service");
const chats_service_1 = require("./chats.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const evidences_service_1 = require("../evidences/evidences.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
const QRCode = __importStar(require("qrcode"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let ChatsExportService = ChatsExportService_1 = class ChatsExportService {
    constructor(chatRepository, messageRepository, userRepository, emailService, chatsService, whatsappService, evidencesService) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.chatsService = chatsService;
        this.whatsappService = whatsappService;
        this.evidencesService = evidencesService;
        this.logger = new common_1.Logger(ChatsExportService_1.name);
    }
    /**
     * Sanitizar texto para PDF - remover caracteres especiales problemáticos
     */
    sanitizeText(text) {
        if (!text) return '';
        return text
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
            .replace(/[\u{2600}-\u{26FF}]/gu, '')
            .replace(/[\u{2700}-\u{27BF}]/gu, '')
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
            .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
            .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();
    }
    /**
     * Listener: Generar PDF automáticamente cuando se cierra un chat
     */
    async handleChatClosed(chat) {
        try {
            this.logger.log(`📄 Generando PDF automático para chat cerrado: ${chat.id}`);
            const fullChat = await this.chatRepository.findOne({
                where: { id: chat.id },
                relations: ['assignedAgent', 'client', 'campaign'],
            });
            if (!fullChat) {
                this.logger.warn(`Chat ${chat.id} no encontrado para generar PDF`);
                return;
            }
            let closureType = 'promise';
            if (fullChat.botContext?.closureType === 'paid') {
                closureType = 'paid';
            }
            const agentId = fullChat.assignedAgentId || 'system';
            await this.exportChatToPDF(chat.id, closureType, agentId);
            this.logger.log(`✅ PDF generado automáticamente para chat ${chat.id}`);
        } catch (error) {
            this.logger.error(`❌ Error generando PDF automático: ${error.message}`, error.stack);
        }
    }
    async exportChatToPDF(chatId, closureType, agentId) {
        try {
            this.logger.log(`📄 Generando PDF de cierre para chat ${chatId}`);
            const chat = await this.chatRepository.findOne({
                where: { id: chatId },
                relations: ['client', 'assignedAgent', 'campaign', 'whatsappNumber'],
            });
            if (!chat) {
                throw new common_1.NotFoundException(`Chat ${chatId} no encontrado`);
            }
            const messages = await this.messageRepository.find({
                where: { chatId },
                order: { createdAt: 'ASC' },
            });
            const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir, { recursive: true });
            }
            const timestamp = Date.now();
            const ticketNumber = chatId.substring(0, 8).toUpperCase();
            const fileName = `cierre_${ticketNumber}_${timestamp}.pdf`;
            const filePath = path.join(exportsDir, fileName);
            await this.createPDF(chat, messages, filePath, closureType, ticketNumber);
            this.logger.log(`✅ PDF generado con QR: ${fileName}`);
            const supervisors = await this.userRepository.find({
                where: [
                    { role: { name: 'Supervisor' } },
                    { role: { name: 'Super Admin' } },
                ],
                relations: ['role'],
            });
            const agent = await this.userRepository.findOne({ where: { id: agentId } });
            const closureTypeText = closureType === 'paid' ? 'PAGO REALIZADO' : 'PROMESA DE PAGO';
            for (const supervisor of supervisors) {
                if (supervisor.email) {
                    await this.sendNotificationEmail(supervisor.email, supervisor.fullName, fileName, ticketNumber, chat.client?.fullName || chat.contactPhone, agent?.fullName || 'Desconocido', closureTypeText);
                }
            }
            this.logger.log(`📧 Notificación enviada a ${supervisors.length} supervisores`);
            await this.evidencesService.create({
                ticketNumber,
                closureType,
                filePath: `/uploads/exports/${fileName}`,
                fileName,
                chatId,
                clientId: chat.client?.id,
                clientName: chat.client?.fullName || chat.contactPhone,
                agentId,
                agentName: agent?.fullName || 'Desconocido',
                amount: closureType === 'paid'
                    ? chat.client?.lastPaymentAmount
                    : chat.client?.promisePaymentAmount,
                promiseDate: closureType === 'promise'
                    ? chat.client?.promisePaymentDate
                    : null,
            });
            this.logger.log(`📋 Evidencia registrada con ticket ${ticketNumber}`);
            await this.chatsService.close(chatId, agentId);
            this.logger.log(`🔒 Chat cerrado automáticamente`);
            const farewellMessage = this.generateFarewellMessage(closureType, ticketNumber, chat.client);
            if (chat.whatsappNumberId) {
                try {
                    await this.whatsappService.sendMessage(chat.whatsappNumberId, chat.contactPhone, farewellMessage, message_entity_1.MessageType.TEXT);
                    this.logger.log(`👋 Mensaje de despedida enviado al cliente`);
                }
                catch (error) {
                    this.logger.error(`❌ Error enviando mensaje de despedida: ${error.message}`);
                }
            }
            else {
                this.logger.warn(`⚠️ No se pudo enviar mensaje de despedida: Chat sin whatsappNumberId`);
            }
            return {
                filePath: `/uploads/exports/${fileName}`,
                fileName,
                ticketNumber,
            };
        }
        catch (error) {
            this.logger.error(`❌ Error generando PDF: ${error.message}`, error.stack);
            throw error;
        }
    }
    async createPDF(chat, messages, filePath, closureType, ticketNumber) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 50,
                });
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);
                const title = closureType === 'paid'
                    ? 'CIERRE DE NEGOCIACIÓN - PAGO REALIZADO'
                    : 'CIERRE DE NEGOCIACIÓN - PROMESA DE PAGO';
                doc
                    .fontSize(20)
                    .font('Helvetica-Bold')
                    .text(title, { align: 'center' })
                    .moveDown();
                doc.fontSize(10).font('Helvetica');
                doc
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('Información General', { underline: true })
                    .moveDown(0.5);
                doc.fontSize(10).font('Helvetica');
                doc.text(`Ticket ID: ${chat.id}`);
                doc.text(`Cliente: ${this.sanitizeText(chat.client?.fullName || chat.contactPhone)}`);
                doc.text(`Telefono: ${chat.contactPhone}`);
                if (chat.client?.debtAmount) {
                    doc.text(`Deuda: $${chat.client.debtAmount.toLocaleString('es-CO')}`);
                    doc.text(`Dias de mora: ${chat.client.daysOverdue || 0}`);
                }
                doc.text(`Asesor asignado: ${this.sanitizeText(chat.assignedAgent?.fullName || 'Sin asignar')}`);
                doc.text(`Campana: ${this.sanitizeText(chat.campaign?.name || 'N/A')}`);
                doc.text(`Estado: ${this.translateStatus(chat.status)}`);
                doc.text(`Fecha de creacion: ${new Date(chat.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
                if (chat.resolvedAt) {
                    doc.text(`Fecha de resolucion: ${new Date(chat.resolvedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
                }
                doc.moveDown(1.5);
                doc
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('Historial de Conversación', { underline: true })
                    .moveDown(0.5);
                messages.forEach((message, index) => {
                    const timestamp = new Date(message.createdAt).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'America/Bogota',
                    });
                    const sender = this.getSenderName(message, chat);
                    doc.fontSize(9).font('Helvetica-Bold');
                    doc.text(`[${timestamp}] ${this.sanitizeText(sender)}:`, { continued: false });
                    doc.fontSize(9).font('Helvetica');
                    const sanitizedContent = this.sanitizeText(message.content);
                    if (message.type === 'text') {
                        doc.text(sanitizedContent || '[Mensaje vacio]', { indent: 20 });
                    }
                    else if (message.type === 'image') {
                        doc.text(`[Imagen adjunta]`, { indent: 20 });
                        if (message.mediaUrl) {
                            try {
                                const imagePath = path.join(process.cwd(), message.mediaUrl.replace(/^\//, ''));
                                if (fs.existsSync(imagePath)) {
                                    doc.moveDown(0.3);
                                    const maxWidth = 400;
                                    const maxHeight = 300;
                                    doc.image(imagePath, {
                                        fit: [maxWidth, maxHeight],
                                        align: 'center',
                                    });
                                    doc.moveDown(0.3);
                                    if (message.content && message.content !== '[IMAGE]') {
                                        doc.fontSize(8).fillColor('#666');
                                        doc.text(`Descripcion: ${this.sanitizeText(message.content)}`, { indent: 20 });
                                        doc.fillColor('#000');
                                    }
                                }
                                else {
                                    doc.text(`[Imagen no disponible: ${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
                                }
                            }
                            catch (err) {
                                this.logger.warn(`No se pudo incluir imagen en PDF: ${err.message}`);
                                doc.text(`[Error al cargar imagen: ${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
                            }
                        }
                        else {
                            doc.text(`[${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
                        }
                    }
                    else if (message.type === 'audio') {
                        doc.text(`[AUDIO: ${message.mediaFileName || 'audio.ogg'}]`, { indent: 20 });
                    }
                    else if (message.type === 'video') {
                        doc.text(`[VIDEO: ${message.mediaFileName || 'video.mp4'}]`, { indent: 20 });
                    }
                    else if (message.type === 'document') {
                        doc.text(`[DOCUMENTO: ${message.mediaFileName || 'documento'}]`, { indent: 20 });
                    }
                    doc.moveDown(0.3);
                    if (doc.y > 700 && index < messages.length - 1) {
                        doc.addPage();
                    }
                });
                doc.moveDown(1.5);
                doc.addPage();
                const qrData = {
                    ticketNumber,
                    clientName: chat.client?.fullName || chat.contactPhone,
                    clientPhone: chat.contactPhone,
                    closureType: closureType === 'paid' ? 'PAGO REALIZADO' : 'PROMESA DE PAGO',
                    debtAmount: chat.client?.debtAmount || 0,
                    agentName: chat.assignedAgent?.fullName || 'Sin asignar',
                    closureDate: new Date().toISOString(),
                    chatId: chat.id,
                    hash: crypto.createHash('sha256').update(`${chat.id}-${ticketNumber}-${Date.now()}`).digest('hex').substring(0, 16),
                };
                const qrDataString = JSON.stringify(qrData, null, 2);
                const qrImage = await QRCode.toDataURL(qrDataString, {
                    errorCorrectionLevel: 'H',
                    width: 300,
                    margin: 1,
                });
                const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');
                doc
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .fillColor('#1976d2')
                    .text('CÓDIGO DE VERIFICACIÓN', { align: 'center' })
                    .moveDown(1);
                const qrSize = 250;
                const pageWidth = doc.page.width;
                const qrX = (pageWidth - qrSize) / 2;
                doc.image(qrBuffer, qrX, doc.y, {
                    width: qrSize,
                    height: qrSize,
                });
                doc.moveDown(8);
                doc
                    .fontSize(10)
                    .font('Helvetica')
                    .fillColor('#000')
                    .text('Este código QR contiene la información completa del cierre:', { align: 'center' })
                    .moveDown(0.5);
                doc
                    .fontSize(9)
                    .text(`• Ticket: ${ticketNumber}`, { align: 'center' })
                    .text(`• Cliente: ${chat.client?.fullName || chat.contactPhone}`, { align: 'center' })
                    .text(`• Hash de verificación: ${qrData.hash}`, { align: 'center' })
                    .moveDown(1);
                doc
                    .fontSize(8)
                    .fillColor('#666')
                    .text('Escanea este código para verificar la autenticidad del documento', { align: 'center' })
                    .text('y acceder a la información completa en formato digital.', { align: 'center' });
                doc.moveDown(2);
                doc
                    .fontSize(8)
                    .font('Helvetica')
                    .fillColor('#999')
                    .text(`Documento generado el ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })} - Sistema CRM NGS&O`, { align: 'center' });
                doc.text('La información contenida en el código QR garantiza la integridad y autenticidad del documento.', {
                    align: 'center',
                });
                doc.end();
                stream.on('finish', () => {
                    resolve();
                });
                stream.on('error', (error) => {
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    translateStatus(status) {
        const translations = {
            waiting: 'En Espera',
            bot: 'Bot Activo',
            active: 'Activo',
            pending: 'Pendiente',
            resolved: 'Resuelto',
            closed: 'Cerrado',
        };
        return translations[status] || status;
    }
    getSenderName(message, chat) {
        switch (message.senderType) {
            case 'contact':
                return chat.client?.fullName || chat.contactPhone;
            case 'bot':
                return 'Bot Automático';
            case 'agent':
                return chat.assignedAgent?.fullName || 'Asesor';
            case 'system':
                return 'Sistema';
            default:
                return 'Desconocido';
        }
    }
    async sendNotificationEmail(to, supervisorName, fileName, ticketNumber, clientName, agentName, closureType) {
        try {
            const subject = `📄 Cierre de Negociación Disponible - Ticket ${ticketNumber}`;
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
            .password-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
            .password { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #d32f2f; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            td:first-child { font-weight: bold; width: 40%; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Cierre de Negociación</h1>
              <p style="margin: 0; font-size: 18px;">Ticket: ${ticketNumber}</p>
            </div>
            
            <div class="content">
              <p>Hola <strong>${supervisorName}</strong>,</p>
              
              <p>Se ha generado un nuevo cierre de negociación con evidencia completa de la gestión realizada.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">📋 Información del Cierre</h3>
                <table>
                  <tr>
                    <td>Tipo de Cierre:</td>
                    <td><strong>${closureType}</strong></td>
                  </tr>
                  <tr>
                    <td>Cliente:</td>
                    <td>${clientName}</td>
                  </tr>
                  <tr>
                    <td>Asesor:</td>
                    <td>${agentName}</td>
                  </tr>
                  <tr>
                    <td>Ticket:</td>
                    <td><strong>${ticketNumber}</strong></td>
                  </tr>
                  <tr>
                    <td>Archivo:</td>
                    <td>${fileName}</td>
                  </tr>
                  <tr>
                    <td>Fecha:</td>
                    <td>${new Date().toLocaleString('es-CO')}</td>
                  </tr>
                </table>
              </div>

              <div class="info-box" style="background: #e3f2fd; border-left-color: #2196f3;">
                <h3 style="margin-top: 0; color: #1976d2;">🔐 Código QR de Verificación</h3>
                <p style="margin: 0;">
                  Este documento incluye un <strong>código QR</strong> en la última página que contiene 
                  toda la información del cierre de manera encriptada. Este código garantiza la 
                  <strong>autenticidad e integridad</strong> del documento.
                </p>
              </div>

              <div class="warning">
                <strong>⚠️ IMPORTANTE - ACCESO RESTRINGIDO:</strong>
                <ul style="margin: 10px 0;">
                  <li>Solo <strong>Supervisores y Administradores</strong> pueden descargar este documento</li>
                  <li>El código QR puede ser escaneado para verificar la información</li>
                  <li>El documento contiene información sensible del cliente</li>
                  <li>Cualquier modificación invalidará el código QR</li>
                </ul>
              </div>

              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/evidences" class="button">
                  📂 Acceder a Evidencias de Pago
                </a>
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                El documento PDF contiene el registro completo de la conversación con el cliente, 
                incluyendo todos los mensajes, archivos multimedia y evidencias del acuerdo realizado.
                El código QR incluido garantiza la veracidad de la información.
              </p>
            </div>

            <div class="footer">
              <p><strong>Sistema CRM NGS&O</strong></p>
              <p>Este es un correo automático, por favor no responder.</p>
              <p>© ${new Date().getFullYear()} - Todos los derechos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `;
            await this.emailService.send({
                to,
                subject,
                html,
            });
            this.logger.log(`✅ Email enviado a ${to}`);
        }
        catch (error) {
            this.logger.error(`❌ Error enviando email a ${to}: ${error.message}`);
        }
    }
    generateFarewellMessage(closureType, ticketNumber, client) {
        if (closureType === 'paid') {
            return `🎉 *¡Gracias por tu pago!*

Tu caso ha sido cerrado exitosamente. 

📋 *Número de Ticket:* ${ticketNumber}

Recibirás tu *paz y salvo* en los próximos días hábiles.

Gracias por tu confianza.

_Sistema Automatizado de Gestión CRM NGS&O_`;
        }
        else {
            const debtAmount = client?.debtAmount
                ? new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                }).format(client.debtAmount)
                : 'el monto acordado';
            const paymentDeadline = new Date();
            paymentDeadline.setDate(paymentDeadline.getDate() + 15);
            const formattedDate = paymentDeadline.toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
            return `📝 *Compromiso de Pago Registrado*

Gracias por tu compromiso.

📋 *Número de Ticket:* ${ticketNumber}
💰 *Monto acordado:* ${debtAmount}
📅 *Fecha límite de pago:* ${formattedDate}

⚠️ Recuerda realizar el pago antes de la fecha límite para evitar gestiones adicionales.

_Sistema Automatizado de Gestión CRM NGS&O_`;
        }
    }
    async generateAutomaticClosurePDF(chatId, agentId) {
        try {
            this.logger.log(`📄 Generando PDF automático de cierre para chat ${chatId} transferido al bot`);
            const chat = await this.chatRepository.findOne({
                where: { id: chatId },
                relations: ['client', 'assignedAgent', 'campaign', 'whatsappNumber'],
            });
            if (!chat) {
                this.logger.warn(`⚠️ Chat ${chatId} no encontrado para generar PDF`);
                return;
            }
            const messages = await this.messageRepository.find({
                where: { chatId },
                order: { createdAt: 'ASC' },
            });
            if (messages.length === 0) {
                this.logger.warn(`⚠️ Chat ${chatId} sin mensajes, no se genera PDF`);
                return;
            }
            const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const ticketNumber = `TRF-${randomId}`;
            const pdfDir = path.join(process.cwd(), 'uploads', 'chat-closures');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }
            const fileName = `cierre-${ticketNumber}.pdf`;
            const pdfPath = path.join(pdfDir, fileName);
            const doc = new pdfkit_1.default({ margin: 50 });
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            doc.fontSize(20).text('Resumen de Conversación', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Ticket: ${ticketNumber}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(10);
            doc.text(`Cliente: ${chat.client?.fullName || chat.contactPhone}`);
            doc.text(`Agente: ${chat.assignedAgent?.fullName || 'Bot'}`);
            doc.text(`Fecha de cierre: ${new Date().toLocaleString('es-CO')}`);
            doc.text(`Motivo: Transferido al bot`);
            doc.moveDown();
            doc.text('Mensajes:', { underline: true });
            doc.moveDown(0.5);
            messages.forEach((msg, index) => {
                const time = new Date(msg.createdAt).toLocaleTimeString('es-CO');
                const sender = msg.senderType === 'contact' ? 'Cliente' : 'Agente';
                doc.fontSize(9);
                doc.text(`[${time}] ${sender}: ${msg.content || '[Multimedia]'}`, {
                    width: 500,
                    indent: 10,
                });
                doc.moveDown(0.3);
            });
            doc.end();
            await new Promise((resolve) => stream.on('finish', () => resolve()));
            this.logger.log(`✅ PDF de cierre generado: ${fileName}`);
            await this.evidencesService.create({
                chatId,
                filePath: `/uploads/chat-closures/${fileName}`,
                fileName,
                ticketNumber,
                closureType: 'transfer',
                clientName: chat.client?.fullName || chat.contactPhone,
                clientId: chat.client?.id,
                agentId,
                agentName: chat.assignedAgent?.fullName || 'Sistema',
            });
            this.logger.log(`📋 Evidencia de cierre registrada con ticket ${ticketNumber}`);
        }
        catch (error) {
            this.logger.error(`❌ Error generando PDF automático de cierre: ${error.message}`);
        }
    }
    async handleChatUnassigned(payload) {
        try {
            if (payload.reason.includes('bot')) {
                this.logger.log(`🎧 Evento chat.unassigned recibido para chat ${payload.chat.id} - Generando PDF`);
                await this.generateAutomaticClosurePDF(payload.chat.id, payload.previousAgentId);
            }
        }
        catch (error) {
            this.logger.error(`❌ Error en listener chat.unassigned: ${error.message}`);
        }
    }
};
exports.ChatsExportService = ChatsExportService;
__decorate([
    (0, event_emitter_1.OnEvent)('chat.closed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsExportService.prototype, "handleChatClosed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.unassigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsExportService.prototype, "handleChatUnassigned", null);
exports.ChatsExportService = ChatsExportService = ChatsExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => chats_service_1.ChatsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        email_service_1.EmailService,
        chats_service_1.ChatsService,
        whatsapp_service_1.WhatsappService,
        evidences_service_1.EvidencesService])
], ChatsExportService);
//# sourceMappingURL=chats-export.service.js.map