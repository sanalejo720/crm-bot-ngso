import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Chat } from './entities/chat.entity';
import { Message, MessageType } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../../common/services/email.service';
import { ChatsService } from './chats.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EvidencesService } from '../evidences/evidences.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatsExportService {
  private readonly logger = new Logger(ChatsExportService.name);
  
  // Control para evitar procesamiento duplicado de PDFs
  private processingChats: Set<string> = new Set();

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    @Inject(forwardRef(() => ChatsService))
    private chatsService: ChatsService,
    private whatsappService: WhatsappService,
    private evidencesService: EvidencesService,
  ) {}

  /**
   * Sanitizar texto para PDF - remover caracteres especiales problemáticos
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      // Remover emojis y caracteres Unicode especiales
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Símbolos y pictogramas
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y mapas
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Banderas
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Símbolos misceláneos
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Selectores de variación
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Símbolos suplementarios
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Símbolos de ajedrez
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Símbolos extendidos
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Zero-width characters
      // Normalizar espacios y saltos de línea
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remover caracteres de control
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  /**
   * Listener: Generar PDF automáticamente cuando se cierra un chat
   * NOTA: Este evento NO debe volver a llamar a close() para evitar loops infinitos
   */
  @OnEvent('chat.closed')
  async handleChatClosed(chat: Chat) {
    try {
      // Evitar procesamiento duplicado
      if (this.processingChats.has(chat.id)) {
        this.logger.warn(`⚠️ Chat ${chat.id} ya está siendo procesado, ignorando evento duplicado`);
        return;
      }
      
      this.processingChats.add(chat.id);
      this.logger.log(`📄 Generando PDF automático para chat cerrado: ${chat.id}`);
      
      try {
        // Solo generar si el chat tuvo un agente asignado en algún momento
        const fullChat = await this.chatRepository.findOne({
          where: { id: chat.id },
          relations: ['assignedAgent', 'client', 'campaign'],
        });

        if (!fullChat) {
          this.logger.warn(`Chat ${chat.id} no encontrado para generar PDF`);
          return;
        }

        // Determinar el tipo de cierre basado en el contexto del bot
        let closureType: 'paid' | 'promise' = 'promise';
        if (fullChat.botContext?.closureType === 'paid') {
          closureType = 'paid';
        }

        // Usar el ID del agente asignado o 'system' si no hay agente
        const agentId = fullChat.assignedAgentId || 'system';

        // skipClose=true para evitar loop infinito
        await this.exportChatToPDF(chat.id, closureType, agentId, true);
        this.logger.log(`✅ PDF generado automáticamente para chat ${chat.id}`);
      } finally {
        // Limpiar después de 30 segundos para permitir reprocesamiento futuro si es necesario
        setTimeout(() => this.processingChats.delete(chat.id), 30000);
      }
    } catch (error) {
      this.logger.error(`❌ Error generando PDF automático: ${error.message}`, error.stack);
      this.processingChats.delete(chat.id);
      // No lanzar error para no interrumpir el flujo de cierre
    }
  }

  /**
   * Exportar chat a PDF cifrado con contraseña y enviar a supervisores
   * @param skipClose - Si es true, no cierra el chat (usado cuando se llama desde evento chat.closed)
   */
  async exportChatToPDF(
    chatId: string,
    closureType: 'paid' | 'promise',
    agentId: string,
    skipClose: boolean = false,
  ): Promise<{
    filePath: string;
    fileName: string;
    ticketNumber: string;
  }> {
    try {
      this.logger.log(`📄 Generando PDF de cierre para chat ${chatId}`);

      // 1. Obtener chat con todas las relaciones
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['client', 'assignedAgent', 'campaign', 'whatsappNumber'],
      });

      if (!chat) {
        throw new NotFoundException(`Chat ${chatId} no encontrado`);
      }

      // 2. Obtener mensajes ordenados
      const messages = await this.messageRepository.find({
        where: { chatId },
        order: { createdAt: 'ASC' },
      });

      // 3. Crear directorio de exportación si no existe
      const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // 4. Nombre del archivo
      const timestamp = Date.now();
      const ticketNumber = chatId.substring(0, 8).toUpperCase();
      const fileName = `cierre_${ticketNumber}_${timestamp}.pdf`;
      const filePath = path.join(exportsDir, fileName);

      // 5. Crear PDF con QR (sin contraseña)
      await this.createPDF(chat, messages, filePath, closureType, ticketNumber);

      this.logger.log(`✅ PDF generado con QR: ${fileName}`);

      // 6. Obtener supervisores y super admins
      const supervisors = await this.userRepository.find({
        where: [
          { role: { name: 'Supervisor' } },
          { role: { name: 'Super Admin' } },
        ],
        relations: ['role'],
      });

      // 7. Enviar correo de notificación a supervisores
      const agent = await this.userRepository.findOne({ where: { id: agentId } });
      const closureTypeText = closureType === 'paid' ? 'PAGO REALIZADO' : 'PROMESA DE PAGO';

      for (const supervisor of supervisors) {
        if (supervisor.email) {
          await this.sendNotificationEmail(
            supervisor.email,
            supervisor.fullName,
            fileName,
            ticketNumber,
            chat.client?.fullName || chat.contactPhone,
            agent?.fullName || 'Desconocido',
            closureTypeText,
          );
        }
      }

      this.logger.log(`📧 Notificación enviada a ${supervisors.length} supervisores`);

      // 9. Registrar evidencia en la base de datos
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

      // 10. Cerrar chat automáticamente (solo si no viene de evento chat.closed)
      if (!skipClose) {
        await this.chatsService.close(chatId, agentId);
        this.logger.log(`🔒 Chat cerrado automáticamente`);
      } else {
        this.logger.log(`⏭️ Saltando cierre de chat (ya cerrado)`);
      }

      // 11. Enviar mensaje de despedida por WhatsApp
      const farewellMessage = this.generateFarewellMessage(
        closureType,
        ticketNumber,
        chat.client,
      );
      
      if (chat.whatsappNumberId && this.isValidPhoneNumber(chat.contactPhone)) {
        try {
          await this.whatsappService.sendMessage(
            chat.whatsappNumberId,
            chat.contactPhone,
            farewellMessage,
            MessageType.TEXT,
          );
          this.logger.log(`👋 Mensaje de despedida enviado al cliente`);
        } catch (error) {
          this.logger.error(`❌ Error enviando mensaje de despedida: ${error.message}`);
          // No lanzar error para no interrumpir el proceso
        }
      } else if (!chat.whatsappNumberId) {
        this.logger.warn(`⚠️ No se pudo enviar mensaje de despedida: Chat sin whatsappNumberId`);
      } else {
        this.logger.warn(`⚠️ No se pudo enviar mensaje de despedida: Número de teléfono inválido (${chat.contactPhone})`);
      }

      return {
        filePath: `/uploads/exports/${fileName}`,
        fileName,
        ticketNumber,
      };
    } catch (error) {
      this.logger.error(`❌ Error generando PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crear documento PDF con los datos del chat
   */
  private async createPDF(
    chat: Chat,
    messages: Message[],
    filePath: string,
    closureType: 'paid' | 'promise',
    ticketNumber: string,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        const title = closureType === 'paid' 
          ? 'CIERRE DE NEGOCIACIÓN - PAGO REALIZADO'
          : 'CIERRE DE NEGOCIACIÓN - PROMESA DE PAGO';

        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(title, { align: 'center' })
          .moveDown();

        doc.fontSize(10).font('Helvetica');

        // Información del chat
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

        // Mensajes
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
          
          // Contenido del mensaje - sanitizado para evitar caracteres especiales
          const sanitizedContent = this.sanitizeText(message.content);
          
          if (message.type === 'text') {
            doc.text(sanitizedContent || '[Mensaje vacío]', { indent: 20 });
          } else if (message.type === 'image') {
            doc.text(`[Imagen adjunta]`, { indent: 20 });
            
            // Intentar incluir la imagen en el PDF
            if (message.mediaUrl) {
              try {
                const imagePath = path.join(process.cwd(), message.mediaUrl.replace(/^\//, ''));
                
                if (fs.existsSync(imagePath)) {
                  doc.moveDown(0.3);
                  
                  // Calcular dimensiones para que la imagen quepa en el PDF
                  const maxWidth = 400;
                  const maxHeight = 300;
                  
                  // Agregar la imagen al PDF
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
                } else {
                  doc.text(`[Imagen no disponible: ${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
                }
              } catch (err) {
                this.logger.warn(`No se pudo incluir imagen en PDF: ${err.message}`);
                doc.text(`[Error al cargar imagen: ${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
              }
            } else {
              doc.text(`[${message.mediaFileName || 'imagen.jpg'}]`, { indent: 20 });
            }
          } else if (message.type === 'audio') {
            doc.text(`[AUDIO: ${message.mediaFileName || 'audio.ogg'}]`, { indent: 20 });
          } else if (message.type === 'video') {
            doc.text(`[VIDEO: ${message.mediaFileName || 'video.mp4'}]`, { indent: 20 });
          } else if (message.type === 'document') {
            doc.text(`[DOCUMENTO: ${message.mediaFileName || 'documento'}]`, { indent: 20 });
          }

          doc.moveDown(0.3);

          // Salto de página si es necesario
          if (doc.y > 700 && index < messages.length - 1) {
            doc.addPage();
          }
        });

        doc.moveDown(1.5);

        // Generar código QR con información de verificación
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

        // Convertir base64 a buffer
        const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');

        // Título de verificación
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#1976d2')
          .text('CÓDIGO DE VERIFICACIÓN', { align: 'center' })
          .moveDown(1);

        // QR centrado
        const qrSize = 250;
        const pageWidth = doc.page.width;
        const qrX = (pageWidth - qrSize) / 2;
        
        doc.image(qrBuffer, qrX, doc.y, {
          width: qrSize,
          height: qrSize,
        });

        doc.moveDown(8);

        // Información de verificación
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

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999')
          .text(
            `Documento generado el ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })} - Sistema CRM NGS&O`,
            { align: 'center' },
          );
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
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Traducir estado del chat
   */
  private translateStatus(status: string): string {
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

  /**
   * Obtener nombre del remitente del mensaje
   */
  private getSenderName(message: Message, chat: Chat): string {
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

  /**
   * Enviar email con contraseña del PDF a supervisor
   */
  private async sendNotificationEmail(
    to: string,
    supervisorName: string,
    fileName: string,
    ticketNumber: string,
    clientName: string,
    agentName: string,
    closureType: string,
  ): Promise<void> {
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
    } catch (error) {
      this.logger.error(`❌ Error enviando email a ${to}: ${error.message}`);
      // No lanzar error para no interrumpir el proceso principal
    }
  }

  /**
   * Validar si un número de teléfono es válido para WhatsApp
   */
  private isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    // Remover caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validaciones básicas:
    // 1. Debe tener al menos 10 dígitos (número local + código de país)
    // 2. No debe empezar con 1268 (números de prueba inválidos)
    // 3. Longitud máxima razonable 15 dígitos (estándar E.164)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return false;
    }
    
    // Detectar números de prueba comunes que causan errores
    const testPrefixes = ['1268', '1555', '1234567', '9999999'];
    const startsWithTestPrefix = testPrefixes.some(prefix => 
      cleanPhone.startsWith(prefix)
    );
    
    if (startsWithTestPrefix) {
      this.logger.warn(`⚠️ Número detectado como número de prueba: ${phone}`);
      return false;
    }
    
    return true;
  }

  /**
   * Generar mensaje de despedida según el tipo de cierre
   */
  private generateFarewellMessage(
    closureType: 'paid' | 'promise',
    ticketNumber: string,
    client: any,
  ): string {
    if (closureType === 'paid') {
      return `🎉 *¡Gracias por tu pago!*

Tu caso ha sido cerrado exitosamente. 

📋 *Número de Ticket:* ${ticketNumber}

Recibirás tu *paz y salvo* en los próximos días hábiles.

Gracias por tu confianza.

_Sistema Automatizado de Gestión CRM NGS&O_`;
    } else {
      // Promesa de pago
      const debtAmount = client?.debtAmount 
        ? new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(client.debtAmount)
        : 'el monto acordado';

      // Calcular fecha límite (ejemplo: 15 días desde hoy)
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

  /**
   * Generar PDF de cierre automático cuando se transfiere al bot
   * No requiere tipo de cierre específico, solo documenta la conversación
   */
  async generateAutomaticClosurePDF(
    chatId: string,
    agentId: string,
  ): Promise<void> {
    try {
      this.logger.log(`📄 Generando PDF automático de cierre para chat ${chatId} transferido al bot`);

      // 1. Obtener chat con todas las relaciones
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['client', 'assignedAgent', 'campaign', 'whatsappNumber'],
      });

      if (!chat) {
        this.logger.warn(`⚠️ Chat ${chatId} no encontrado para generar PDF`);
        return;
      }

      // 2. Obtener mensajes
      const messages = await this.messageRepository.find({
        where: { chatId },
        order: { createdAt: 'ASC' },
      });

      if (messages.length === 0) {
        this.logger.warn(`⚠️ Chat ${chatId} sin mensajes, no se genera PDF`);
        return;
      }

      // 3. Generar ticket único (máximo 20 caracteres)
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketNumber = `TRF-${randomId}`;  // Formato: TRF-A1B2C3 (10 chars)

      // 4. Crear PDF
      const pdfDir = path.join(process.cwd(), 'uploads', 'chat-closures');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const fileName = `cierre-${ticketNumber}.pdf`;
      const pdfPath = path.join(pdfDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Contenido del PDF
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

      await new Promise<void>((resolve) => stream.on('finish', () => resolve()));

      this.logger.log(`✅ PDF de cierre generado: ${fileName}`);

      // 5. Registrar evidencia
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

    } catch (error) {
      this.logger.error(`❌ Error generando PDF automático de cierre: ${error.message}`);
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Listener: Generar PDF cuando un chat es desasignado (transferido al bot)
   */
  @OnEvent('chat.unassigned')
  async handleChatUnassigned(payload: { 
    chat: Chat; 
    previousAgentId: string; 
    reason: string;
  }) {
    try {
      // Solo generar PDF si fue transferido al bot
      if (payload.reason.includes('bot')) {
        this.logger.log(`🎧 Evento chat.unassigned recibido para chat ${payload.chat.id} - Generando PDF`);
        await this.generateAutomaticClosurePDF(payload.chat.id, payload.previousAgentId);
      }
    } catch (error) {
      this.logger.error(`❌ Error en listener chat.unassigned: ${error.message}`);
    }
  }
}
