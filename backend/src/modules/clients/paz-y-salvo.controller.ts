// Paz y Salvo Controller - NGS&O CRM Gestión
// API REST para gestión de certificados de paz y salvo
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PazYSalvoService } from './paz-y-salvo.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('paz-y-salvo')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PazYSalvoController {
  private readonly logger = new Logger(PazYSalvoController.name);

  constructor(private readonly pazYSalvoService: PazYSalvoService) {}

  /**
   * Verificar disponibilidad del paz y salvo para un cliente
   * GET /paz-y-salvo/check/:clientId
   */
  @Get('check/:clientId')
  @RequirePermissions({ module: 'clients', action: 'read' })
  async checkAvailability(@Param('clientId') clientId: string) {
    this.logger.log(`🔍 Verificando disponibilidad de paz y salvo para cliente: ${clientId}`);
    
    const result = await this.pazYSalvoService.checkAvailability(clientId);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Obtener información del paz y salvo de un cliente
   * GET /paz-y-salvo/client/:clientId
   */
  @Get('client/:clientId')
  @RequirePermissions({ module: 'clients', action: 'read' })
  async getByClientId(@Param('clientId') clientId: string) {
    this.logger.log(`📄 Obteniendo paz y salvo para cliente: ${clientId}`);
    
    const pazYSalvo = await this.pazYSalvoService.getByClientId(clientId);
    
    return {
      success: true,
      data: pazYSalvo,
    };
  }

  /**
   * Descargar el PDF del paz y salvo
   * GET /paz-y-salvo/download/:clientId
   */
  @Get('download/:clientId')
  @RequirePermissions({ module: 'clients', action: 'read' })
  async downloadPazYSalvo(
    @Param('clientId') clientId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`📥 Descargando paz y salvo para cliente: ${clientId}`);

      // Verificar disponibilidad
      const { isAvailable, pazYSalvo, message } = await this.pazYSalvoService.checkAvailability(clientId);

      if (!isAvailable) {
        return res.status(403).json({
          success: false,
          message,
        });
      }

      // Generar PDF si no existe
      const filePath = await this.pazYSalvoService.generatePDF(
        pazYSalvo.id,
        req.user?.id,
      );

      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado',
        });
      }

      // Registrar descarga
      await this.pazYSalvoService.registerDownload(pazYSalvo.id, req.user?.id);

      // Enviar archivo
      const fileName = `Paz-y-Salvo-${pazYSalvo.client.fullName.replace(/\s+/g, '-')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      this.logger.log(`✅ Paz y salvo descargado exitosamente: ${fileName}`);
    } catch (error) {
      this.logger.error(`❌ Error descargando paz y salvo: ${error.message}`);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Error al descargar el paz y salvo',
        });
      }
    }
  }

  /**
   * Crear paz y salvo manualmente (para administradores)
   * POST /paz-y-salvo/create/:clientId
   */
  @Post('create/:clientId')
  @RequirePermissions({ module: 'clients', action: 'update' })
  async createPazYSalvo(
    @Param('clientId') clientId: string,
    @Request() req,
  ) {
    this.logger.log(`📝 Creando paz y salvo para cliente: ${clientId}`);

    const pazYSalvo = await this.pazYSalvoService.createPazYSalvo(
      clientId,
      new Date(),
      0, // Monto se toma del cliente
      {
        createdBy: req.user?.id,
        createdByName: req.user?.username,
      },
    );

    return {
      success: true,
      message: 'Paz y salvo creado exitosamente',
      data: pazYSalvo,
    };
  }
}
