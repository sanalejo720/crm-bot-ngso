// Financial Controller - NGS&O CRM Gestión
// Endpoints para estadísticas financieras y recaudo
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { FinancialStatsService } from './financial-stats.service';

@ApiTags('financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('financial')
export class FinancialController {
  constructor(private readonly financialStatsService: FinancialStatsService) {}

  @Get('summary')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Resumen financiero global con filtros de período' })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: false,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getFinancialSummary(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (period === 'custom') {
      if (!startDate || !endDate) {
        throw new BadRequestException(
          'Se requieren startDate y endDate para período custom',
        );
      }
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const data = await this.financialStatsService.getFinancialSummary(
      period,
      start,
      end,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('campaigns/:id/stats')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Estadísticas financieras de una campaña específica' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCampaignFinancials(
    @Param('id') campaignId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();

    const data = await this.financialStatsService.getCampaignFinancials(
      campaignId,
      start,
      end,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('agents/:id/recaudo')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Recaudo de un agente específico' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAgentRecaudo(
    @Param('id') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();

    const data = await this.financialStatsService.getAgentRecaudo(
      agentId,
      start,
      end,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('daily')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Estadísticas financieras del día' })
  @ApiQuery({ name: 'date', required: false, type: String })
  async getDailyFinancials(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();

    const data = await this.financialStatsService.getDailyFinancials(targetDate);

    return {
      success: true,
      data,
    };
  }

  @Get('trend')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Tendencia financiera en un rango de fechas' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getFinancialTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Se requieren startDate y endDate');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const data = await this.financialStatsService.getFinancialTrend(start, end);

    return {
      success: true,
      data,
    };
  }

  @Get('ranking/agents')
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiOperation({ summary: 'Ranking de agentes por recaudo' })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: false,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAgentsRanking(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (period === 'custom') {
      if (!startDate || !endDate) {
        throw new BadRequestException(
          'Se requieren startDate y endDate para período custom',
        );
      }
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const summary = await this.financialStatsService.getFinancialSummary(
      period,
      start,
      end,
    );

    return {
      success: true,
      data: summary.topAgents,
    };
  }
}
