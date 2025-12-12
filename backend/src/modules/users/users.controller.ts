import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AgentSessionsService } from './services/agent-sessions.service';
import { UserCampaignsService } from './services/user-campaigns.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { UserStatus } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly agentSessionsService: AgentSessionsService,
    private readonly userCampaignsService: UserCampaignsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @RequirePermissions({ module: 'users', action: 'create' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @RequirePermissions({ module: 'users', action: 'read' })
  findAll(
    @Query('status') status?: UserStatus,
    @Query('roleId') roleId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('isAgent') isAgent?: string,
  ) {
    const isAgentBool = isAgent === 'true';
    return this.usersService.findAll({ status, roleId, campaignId, isAgent: isAgentBool });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @RequirePermissions({ module: 'users', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @RequirePermissions({ module: 'users', action: 'update' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  @RequirePermissions({ module: 'users', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('campaign/:campaignId/available')
  @ApiOperation({ summary: 'Obtener agentes disponibles de una campaña' })
  @RequirePermissions({ module: 'users', action: 'read' })
  getAvailableAgents(@Param('campaignId') campaignId: string) {
    return this.usersService.getAvailableAgents(campaignId);
  }

  @Put(':id/campaigns')
  @ApiOperation({ summary: 'Asignar campañas a un usuario' })
  @RequirePermissions({ module: 'users', action: 'update' })
  async assignCampaigns(
    @Param('id') id: string,
    @Body() body: { campaignIds: string[], primaryCampaignId?: string },
  ) {
    const assignments = await this.userCampaignsService.assignUserToCampaigns(
      id,
      body.campaignIds,
      body.primaryCampaignId,
    );
    return {
      success: true,
      data: assignments,
      message: `Usuario asignado a ${body.campaignIds.length} campaña(s)`,
    };
  }

  @Get(':id/campaigns')
  @ApiOperation({ summary: 'Obtener campañas asignadas a un usuario' })
  @RequirePermissions({ module: 'users', action: 'read' })
  async getUserCampaigns(@Param('id') id: string) {
    const campaigns = await this.userCampaignsService.getUserCampaigns(id);
    return {
      success: true,
      data: campaigns,
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del usuario' })
  @RequirePermissions({ module: 'users', action: 'update' })
  changeStatus(@Param('id') id: string, @Body() body: { status: UserStatus }) {
    return this.usersService.update(id, { status: body.status });
  }

  @Get(':id/sessions/history')
  @ApiOperation({ summary: 'Obtener historial de sesiones de un agente' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @RequirePermissions({ module: 'users', action: 'read' })
  async getAgentSessionHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const history = await this.agentSessionsService.getAgentHistory(id, start, end);
    
    return {
      success: true,
      data: history,
    };
  }

  @Get(':id/sessions/attendance-stats')
  @ApiOperation({ summary: 'Obtener estadísticas de asistencia de un agente' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @RequirePermissions({ module: 'users', action: 'read' })
  async getAgentAttendanceStats(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const stats = await this.agentSessionsService.getAttendanceStats(
      id,
      new Date(startDate),
      new Date(endDate),
    );
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Obtener todas las sesiones activas de agentes' })
  @RequirePermissions({ module: 'users', action: 'read' })
  async getAllActiveSessions() {
    const sessions = await this.agentSessionsService.getAllActiveSessions();
    
    return {
      success: true,
      data: sessions,
      count: sessions.length,
    };
  }
}
