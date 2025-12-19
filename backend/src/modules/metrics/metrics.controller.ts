import { 
  Controller, 
  Get, 
  Post,
  Body,
  Query, 
  UseGuards,
  Param,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';
import { PaymentSource, PaymentStatus } from './entities/payment-record.entity';

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

  // ==================== MÉTRICAS DE RECAUDO ====================

  @Post('payments')
  @ApiOperation({ summary: 'Registrar un pago' })
  async recordPayment(
    @Body() dto: {
      clientId: string;
      agentId?: string;
      campaignId?: string;
      amount: number;
      paymentDate: string;
      source?: PaymentSource;
      status?: PaymentStatus;
      referenceId?: string;
      notes?: string;
    },
    @Req() req: any,
  ) {
    return this.metricsService.recordPayment(dto, req.user?.id);
  }

  @Get('collection')
  @ApiOperation({ summary: 'Obtener métricas generales de recaudo' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  async getCollectionMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('agentId') agentId?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.metricsService.getCollectionMetrics({
      startDate,
      endDate,
      agentId,
      campaignId,
    });
  }

  @Get('collection/agents')
  @ApiOperation({ summary: 'Obtener ranking de recaudo por agente' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  async getAgentCollectionMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.metricsService.getAgentCollectionMetrics({
      startDate,
      endDate,
      campaignId,
    });
  }

  @Get('collection/timeseries')
  @ApiOperation({ summary: 'Obtener métricas de recaudo en serie de tiempo' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  async getCollectionTimeSeries(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('agentId') agentId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.metricsService.getCollectionTimeSeries({
      startDate,
      endDate,
      agentId,
      campaignId,
      groupBy,
    });
  }

  @Get('portfolio')
  @ApiOperation({ summary: 'Obtener resumen de cartera' })
  @ApiQuery({ name: 'campaignId', required: false })
  async getPortfolioSummary(@Query('campaignId') campaignId?: string) {
    return this.metricsService.getPortfolioSummary(campaignId);
  }
}
