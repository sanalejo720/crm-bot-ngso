import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { EvidencesService } from './evidences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Evidencias de Pago')
@ApiBearerAuth()
@Controller('evidences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar evidencias de pago (Solo Supervisores y Super Admin)' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async findAll(
    @Query('closureType') closureType?: 'paid' | 'promise' | 'transfer',
    @Query('agentId') agentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};

    if (closureType) filters.closureType = closureType;
    if (agentId) filters.agentId = agentId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const evidences = await this.evidencesService.findAll(filters);

    return {
      success: true,
      data: evidences,
      total: evidences.length,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de evidencias por agente' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async getStats(@Query('agentId') agentId?: string) {
    const stats = await this.evidencesService.getAgentStats(agentId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('download/:ticketNumber')
  @ApiOperation({ summary: 'Descargar PDF de evidencia con QR (Solo Supervisores/Admins)' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async downloadEvidence(
    @Param('ticketNumber') ticketNumber: string,
    @Res() res: Response,
    @Request() req,
  ) {
    // Verificar que el usuario es Supervisor o Admin
    const userRole = req.user?.role?.name;
    if (userRole !== 'Supervisor' && userRole !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Supervisores y Administradores pueden descargar evidencias',
      });
    }

    const evidence = await this.evidencesService.findByTicket(ticketNumber);

    // Construir ruta absoluta del archivo
    const filePath = path.join(process.cwd(), evidence.filePath.replace(/^\//, ''));

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado',
      });
    }

    // Enviar archivo
    res.download(filePath, evidence.fileName, (err) => {
      if (err) {
        console.error('Error descargando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error al descargar el archivo',
          });
        }
      }
    });
  }

  @Get(':ticketNumber')
  @ApiOperation({ summary: 'Obtener detalles de evidencia por ticket' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async findOne(@Param('ticketNumber') ticketNumber: string) {
    const evidence = await this.evidencesService.findByTicket(ticketNumber);

    return {
      success: true,
      data: evidence,
    };
  }
}
