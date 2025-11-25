import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('whatsapp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado general de WhatsApp' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  async getGeneralStatus() {
    const activeNumbers = await this.whatsappService.findAllActive();
    return {
      success: true,
      data: {
        connected: activeNumbers.length > 0,
        totalNumbers: activeNumbers.length || 0,
        numbers: activeNumbers,
      },
    };
  }

  @Get('qr')
  @ApiOperation({ summary: 'Obtener código QR para conexión' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  async getQR() {
    // Retornar instrucciones para conectar WhatsApp
    return {
      success: true,
      data: {
        message: 'Use el endpoint POST /whatsapp/:id/wppconnect/start para iniciar una sesión y obtener el QR',
        instruction: 'Primero necesita crear un número WhatsApp en el sistema',
      },
    };
  }

  @Get('check')
  @ApiOperation({ summary: 'Verificar conexión de WhatsApp' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  async checkConnection() {
    const activeNumbers = await this.whatsappService.findAllActive();
    const isConnected = activeNumbers && activeNumbers.length > 0;
    return {
      success: true,
      data: {
        connected: isConnected,
        message: isConnected ? 'WhatsApp conectado' : 'WhatsApp no conectado',
      },
    };
  }

  @Get('numbers')
  @ApiOperation({ summary: 'Obtener todos los números WhatsApp activos' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  findAllActive() {
    return this.whatsappService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener número WhatsApp por ID' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.whatsappService.findOne(id);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Obtener números WhatsApp por campaña' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.whatsappService.findByCampaign(campaignId);
  }

  @Post(':id/wppconnect/start')
  @ApiOperation({ summary: 'Iniciar sesión WPPConnect' })
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  startWppConnectSession(@Param('id') id: string) {
    return this.whatsappService.startWppConnectSession(id);
  }

  @Get(':id/wppconnect/status')
  @ApiOperation({ summary: 'Obtener estado de sesión WPPConnect' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  getWppConnectStatus(@Param('id') id: string) {
    return this.whatsappService.getWppConnectStatus(id);
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Enviar mensaje de WhatsApp' })
  @RequirePermissions({ module: 'whatsapp', action: 'create' })
  async sendMessage(
    @Body()
    body: {
      whatsappNumberId: string;
      to: string;
      content: string;
      type?: string;
    },
  ) {
    const { whatsappNumberId, to, content, type = 'text' } = body;
    
    const result = await this.whatsappService.sendMessage(
      whatsappNumberId,
      to,
      content,
      type as any,
    );

    return {
      success: true,
      data: result,
      message: 'Mensaje enviado correctamente',
    };
  }

  @Get('debug/sessions')
  @ApiOperation({ summary: 'Ver sesiones activas en WPPConnect (DEBUG)' })
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  getDebugSessions() {
    return this.whatsappService.getDebugSessions();
  }
}
