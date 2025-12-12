import { 
  Controller, 
  Get, 
  Query, 
  UseGuards,
  Param,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // ==================== MÉTRICAS DE AGENTE ====================

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Obtener métricas de un agente' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha inicio (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha fin (ISO)' })
  async getAgentMetrics(
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getAgentMetrics(agentId, start, end);
  }

  @Get('agent/:agentId/tmo')
  @ApiOperation({ summary: 'Obtener TMO (Tiempo Medio de Operación) de un agente' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAgentTMO(
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getAgentTMO(agentId, start, end);
  }

  @Get('agent/:agentId/frt')
  @ApiOperation({ summary: 'Obtener FRT (First Response Time) de un agente' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAgentFRT(
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getAgentFRT(agentId, start, end);
  }

  // ==================== MÉTRICAS DE CAMPAÑA ====================

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Obtener métricas de una campaña' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCampaignMetrics(
    @Param('campaignId') campaignId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getCampaignMetrics(campaignId, start, end);
  }

  // ==================== MÉTRICAS DE BOT ====================

  @Get('bot')
  @ApiOperation({ summary: 'Obtener métricas del bot' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getBotMetrics(
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getBotMetrics(campaignId || null, start, end);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener dashboard consolidado para supervisores' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSupervisorDashboard(
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate 
      ? new Date(startDate) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24h por defecto
    const end = endDate ? new Date(endDate) : new Date();

    return this.metricsService.getSupervisorDashboard(
      campaignId || null, 
      start, 
      end
    );
  }

  // ==================== MÉTRICAS EN TIEMPO REAL ====================

  @Get('realtime')
  @ApiOperation({ summary: 'Obtener métricas en tiempo real' })
  @ApiQuery({ name: 'campaignId', required: false })
  async getRealtimeMetrics(@Query('campaignId') campaignId?: string) {
    // Métricas de las últimas 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();

    return this.metricsService.getSupervisorDashboard(
      campaignId || null,
      fiveMinutesAgo,
      now
    );
  }
}
