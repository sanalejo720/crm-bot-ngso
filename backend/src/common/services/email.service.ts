import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    // Verificar conexión SMTP al inicializar
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión SMTP verificada correctamente');
    } catch (error) {
      this.logger.error('❌ Error al verificar conexión SMTP:', error.message);
    }
  }

  async sendBackupPasswordEmail(
    backupId: string,
    masterPassword: string,
    createdBy: string,
    backupName: string,
  ): Promise<void> {
    try {
      const recipient = this.configService.get<string>('BACKUP_EMAIL_RECIPIENT');
      const from = this.configService.get<string>('SMTP_FROM');

      const mailOptions = {
        from,
        to: recipient,
        subject: `🔒 Contraseña de Backup del Sistema - ${backupName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .password-box {
                background: #fff;
                border: 2px solid #667eea;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .password {
                font-size: 20px;
                font-weight: bold;
                color: #667eea;
                font-family: 'Courier New', monospace;
                letter-spacing: 2px;
                word-break: break-all;
              }
              .info-table {
                width: 100%;
                margin: 20px 0;
                border-collapse: collapse;
              }
              .info-table td {
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              .info-table td:first-child {
                font-weight: bold;
                color: #667eea;
                width: 40%;
              }
              .warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔒 Contraseña de Backup del Sistema</h1>
            </div>
            <div class="content">
              <p>Estimado equipo de Gerencia,</p>
              
              <p>Se ha creado un nuevo backup del sistema CRM NGS&O WhatsApp. A continuación encontrará la contraseña maestra necesaria para descargar y descifrar el backup:</p>
              
              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #666;">Contraseña Maestra:</p>
                <div class="password">${masterPassword}</div>
              </div>

              <table class="info-table">
                <tr>
                  <td>📦 Nombre del Backup:</td>
                  <td>${backupName}</td>
                </tr>
                <tr>
                  <td>🆔 ID del Backup:</td>
                  <td>${backupId}</td>
                </tr>
                <tr>
                  <td>👤 Creado por:</td>
                  <td>${createdBy}</td>
                </tr>
                <tr>
                  <td>📅 Fecha:</td>
                  <td>${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
                </tr>
              </table>

              <div class="warning">
                <strong>⚠️ INFORMACIÓN DE SEGURIDAD IMPORTANTE:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Esta contraseña es única y no se puede recuperar</li>
                  <li>Guarde esta contraseña en un lugar seguro</li>
                  <li>NO comparta esta contraseña con personal no autorizado</li>
                  <li>El backup está cifrado con AES-256-CBC</li>
                  <li>Solo el personal de gerencia puede acceder a esta información</li>
                </ul>
              </div>

              <p><strong>Para descargar el backup:</strong></p>
              <ol>
                <li>Acceda al módulo "Backups IT" en el sistema</li>
                <li>Localice el backup con ID: <code>${backupId}</code></li>
                <li>Haga clic en "Descargar"</li>
                <li>Ingrese la contraseña maestra proporcionada arriba</li>
                <li>El archivo ZIP descargado contendrá el backup completo de la base de datos</li>
              </ol>

              <p>Si tiene alguna pregunta o necesita asistencia, por favor contacte al equipo de IT.</p>

              <div class="footer">
                <p>Este es un correo automático del Sistema CRM NGS&O WhatsApp</p>
                <p>Por favor no responda a este correo</p>
                <p>&copy; ${new Date().getFullYear()} NGS&O - Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
CONTRASEÑA DE BACKUP DEL SISTEMA CRM NGS&O

Contraseña Maestra: ${masterPassword}

Información del Backup:
- Nombre: ${backupName}
- ID: ${backupId}
- Creado por: ${createdBy}
- Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}

INFORMACIÓN DE SEGURIDAD:
- Esta contraseña es única y no se puede recuperar
- Guarde esta contraseña en un lugar seguro
- NO comparta esta contraseña con personal no autorizado
- El backup está cifrado con AES-256-CBC

Para descargar el backup, acceda al módulo "Backups IT" en el sistema e ingrese la contraseña proporcionada.

---
Este es un correo automático del Sistema CRM NGS&O WhatsApp
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email de contraseña enviado exitosamente a ${recipient} - MessageID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Error al enviar email de contraseña:`, error.message);
      throw error;
    }
  }
}
