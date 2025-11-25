// Email Service - NGS&O CRM Gestión
// Servicio para envío de correos electrónicos
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true', // false para TLS
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  /**
   * Enviar correo con la contraseña maestra del backup
   */
  async sendBackupPasswordEmail(
    backupId: string,
    fileName: string,
    masterPassword: string,
    createdBy: string,
  ): Promise<void> {
    const recipient = this.configService.get('BACKUP_EMAIL_RECIPIENT');
    const from = this.configService.get('SMTP_FROM');

    const subject = '🔐 Contraseña Maestra de Backup - NGS&O CRM';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border: 1px solid #dee2e6;
          }
          .alert {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .alert-danger {
            background: #f8d7da;
            border-color: #dc3545;
          }
          .password-box {
            background: #fff;
            border: 2px solid #007bff;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .password {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            color: #d32f2f;
            word-break: break-all;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 3px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .footer {
            background: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            font-size: 12px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="icon">🔐</div>
          <h1>Contraseña Maestra de Backup</h1>
          <p>Sistema de Respaldo Cifrado</p>
        </div>
        
        <div class="content">
          <div class="alert alert-danger">
            <strong>⚠️ CONFIDENCIAL - SOLO GERENCIA</strong><br>
            Esta contraseña se envía ÚNICAMENTE a gerencia y NO se almacena en ningún sistema.
            Si se pierde, el backup NO podrá ser recuperado.
          </div>
          
          <p>Se ha generado un nuevo backup del sistema CRM NGS&O.</p>
          
          <table class="info-table">
            <tr>
              <td>ID del Backup:</td>
              <td>${backupId}</td>
            </tr>
            <tr>
              <td>Archivo:</td>
              <td>${fileName}</td>
            </tr>
            <tr>
              <td>Creado por:</td>
              <td>${createdBy}</td>
            </tr>
            <tr>
              <td>Fecha:</td>
              <td>${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
            </tr>
          </table>
          
          <div class="password-box">
            <p style="margin: 0 0 10px 0;"><strong>Contraseña Maestra:</strong></p>
            <div class="password">${masterPassword}</div>
          </div>
          
          <div class="alert">
            <strong>📋 Instrucciones Importantes:</strong>
            <ol>
              <li>Esta contraseña se muestra SOLO UNA VEZ en este correo</li>
              <li>NO se almacena en la base de datos por seguridad</li>
              <li>Guárdela en un lugar seguro (gestor de contraseñas, caja fuerte)</li>
              <li>Se requiere para descargar y descifrar el backup</li>
              <li>Sin esta contraseña, el backup es IRRECUPERABLE</li>
            </ol>
          </div>
          
          <p><strong>Para descargar el backup:</strong></p>
          <ol>
            <li>Ingresar al sistema como Super Admin</li>
            <li>Ir a: Backups IT</li>
            <li>Seleccionar el backup y hacer clic en descargar</li>
            <li>Ingresar esta contraseña maestra</li>
          </ol>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <em>Este es un correo automático del sistema de backups cifrados. Por favor, no responda a este mensaje.</em>
          </p>
        </div>
        
        <div class="footer">
          <strong>NGS&O CRM - Sistema de Gestión de Cobranza</strong><br>
          Desarrollado por AS Software<br>
          © ${new Date().getFullYear()} - Todos los derechos reservados
        </div>
      </body>
      </html>
    `;

    const text = `
🔐 CONTRASEÑA MAESTRA DE BACKUP - NGS&O CRM

⚠️ CONFIDENCIAL - SOLO GERENCIA

Se ha generado un nuevo backup del sistema.

Información del Backup:
- ID: ${backupId}
- Archivo: ${fileName}
- Creado por: ${createdBy}
- Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}

CONTRASEÑA MAESTRA:
${masterPassword}

IMPORTANTE:
- Esta contraseña se muestra SOLO UNA VEZ
- NO se almacena en la base de datos
- Guárdela en un lugar seguro
- Se requiere para descargar el backup
- Sin esta contraseña, el backup es IRRECUPERABLE

Para descargar el backup:
1. Ingresar al sistema como Super Admin
2. Ir a: Backups IT
3. Seleccionar el backup y descargar
4. Ingresar la contraseña maestra

---
NGS&O CRM - Sistema de Gestión de Cobranza
Desarrollado por AS Software
    `.trim();

    try {
      await this.transporter.sendMail({
        from,
        to: recipient,
        subject,
        text,
        html,
      });

      this.logger.log(`✅ Correo con contraseña maestra enviado a: ${recipient}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando correo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar configuración del servicio de email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión SMTP verificada correctamente');
      return true;
    } catch (error) {
      this.logger.error(`❌ Error en configuración SMTP: ${error.message}`);
      return false;
    }
  }
}
