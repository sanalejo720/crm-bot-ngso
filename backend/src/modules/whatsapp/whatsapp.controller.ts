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
@Controller('whatsapp-numbers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
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
}
