// Monitoring Controller - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('numbers/ranking')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Obtener ranking de números por actividad' })
  async getNumbersRanking(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return await this.monitoringService.getNumbersRanking(limit, days);
  }

  @Get('numbers/:numberId/stats')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Obtener estadísticas de un número específico' })
  async getNumberStats(
    @Query('numberId') numberId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return await this.monitoringService.getNumberStats(numberId, days);
  }

  @Get('alerts/recent')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Obtener alertas recientes de palabras ofensivas' })
  async getRecentAlerts(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return await this.monitoringService.getRecentAlerts(limit);
  }

  @Get('offensive-words')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Obtener lista de palabras ofensivas configuradas' })
  getOffensiveWords() {
    return this.monitoringService.getOffensiveWords();
  }

  @Post('offensive-words')
  @RequirePermissions({ module: 'reports', action: 'update' })
  @ApiOperation({ summary: 'Agregar palabra ofensiva personalizada' })
  addOffensiveWord(
    @Body()
    body: {
      word: string;
      category: 'abuse' | 'threat' | 'discrimination' | 'profanity';
      severity: 'low' | 'medium' | 'high' | 'critical';
      target: 'agent' | 'client' | 'both';
    },
  ) {
    this.monitoringService.addCustomOffensiveWord(
      body.word,
      body.category,
      body.severity,
      body.target,
    );
    return {
      success: true,
      message: 'Palabra ofensiva agregada exitosamente',
    };
  }
}
