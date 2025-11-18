import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('system')
  @ApiOperation({ summary: 'Obtener métricas del sistema en tiempo real' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  getSystemMetrics() {
    return this.reportsService.getSystemMetrics();
  }

  @Get('system/stats')
  @ApiOperation({ summary: 'Obtener estadísticas del dashboard' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  async getSystemStats() {
    const metrics = await this.reportsService.getSystemMetrics();
    const pendingTasks = await this.reportsService.getPendingTasksCount();
    const collectionSummary = await this.reportsService.getCollectionSummary();

    return {
      totalAgents: metrics.totalAgents,
      activeAgents: metrics.availableAgents + metrics.busyAgents,
      totalChats: metrics.totalChats,
      activeChats: metrics.activeChats,
      totalDebt: collectionSummary.totalDebt,
      recoveredToday: collectionSummary.recoveredToday,
      pendingTasks,
    };
  }

  @Get('agent/stats')
  @ApiOperation({ summary: 'Obtener estadísticas del agente actual' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.reportsService.getAgentStats(userId);
  }

  @Get('agent/activity')
  @ApiOperation({ summary: 'Obtener actividad reciente del agente actual' })
  async getMyActivity(@CurrentUser('id') userId: string) {
    return this.reportsService.getAgentActivity(userId);
  }

  @Get('agents/performance')
  @ApiOperation({ summary: 'Obtener rendimiento de todos los agentes para dashboard' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  async getAgentsPerformance() {
    return this.reportsService.getAgentsPerformance();
  }

  @Get('agents/:agentId')
  @ApiOperation({ summary: 'Obtener métricas de un agente específico' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getAgentMetrics(
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.reportsService.getAgentMetrics(agentId, dateRange);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Obtener métricas de todos los agentes' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getAllAgentsMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.reportsService.getAllAgentsMetrics(dateRange);
  }

  @Get('agents/ranking/:metric')
  @ApiOperation({ summary: 'Obtener ranking de agentes por métrica' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAgentRanking(
    @Param('metric') metric: 'totalChats' | 'resolvedChats' | 'averageResponseTime' | 'sentMessagesPerHour',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.reportsService.getAgentRanking(metric, dateRange, limit ? parseInt(limit) : 10);
  }

  @Get('campaigns/:campaignId')
  @ApiOperation({ summary: 'Obtener métricas de una campaña específica' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getCampaignMetrics(
    @Param('campaignId') campaignId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.reportsService.getCampaignMetrics(campaignId, dateRange);
  }

  @Get('trends/chats')
  @ApiOperation({ summary: 'Obtener tendencia de chats por día' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'campaignId', required: false, type: String })
  getChatsTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
    return this.reportsService.getChatsTrend(dateRange, campaignId);
  }

  @Get('distribution/chats')
  @ApiOperation({ summary: 'Obtener distribución de chats por estado' })
  @RequirePermissions({ module: 'reports', action: 'read' })
  @ApiQuery({ name: 'campaignId', required: false, type: String })
  getChatsDistribution(@Query('campaignId') campaignId?: string) {
    return this.reportsService.getChatsDistribution(campaignId);
  }
}
