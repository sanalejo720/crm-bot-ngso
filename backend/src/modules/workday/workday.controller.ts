import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkdayService } from './workday.service';
import {
  ClockInDto,
  ClockOutDto,
  StartPauseDto,
  EndPauseDto,
  GetWorkdayStatsDto,
} from './dto/workday.dto';

@ApiTags('workday')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workday')
export class WorkdayController {
  constructor(private readonly workdayService: WorkdayService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Registrar entrada del agente' })
  @ApiResponse({ status: 200, description: 'Entrada registrada' })
  @ApiResponse({ status: 400, description: 'Ya registró entrada hoy' })
  async clockIn(@Request() req, @Body() dto: ClockInDto) {
    return await this.workdayService.clockIn(req.user.id, dto.notes);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Registrar salida del agente' })
  @ApiResponse({ status: 200, description: 'Salida registrada' })
  @ApiResponse({ status: 400, description: 'No ha registrado entrada' })
  async clockOut(@Request() req, @Body() dto: ClockOutDto) {
    return await this.workdayService.clockOut(req.user.id, dto.notes);
  }

  @Post('pause/start')
  @ApiOperation({ summary: 'Iniciar pausa (almuerzo, break, etc.)' })
  @ApiResponse({ status: 200, description: 'Pausa iniciada' })
  @ApiResponse({ status: 400, description: 'Ya tiene una pausa activa' })
  async startPause(@Request() req, @Body() dto: StartPauseDto) {
    return await this.workdayService.startPause(req.user.id, dto.pauseType, dto.reason);
  }

  @Post('pause/end')
  @ApiOperation({ summary: 'Finalizar pausa activa' })
  @ApiResponse({ status: 200, description: 'Pausa finalizada' })
  @ApiResponse({ status: 404, description: 'Pausa no encontrada' })
  async endPause(@Request() req, @Body() dto: EndPauseDto) {
    return await this.workdayService.endPause(req.user.id, dto.pauseId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener jornada actual del agente' })
  @ApiResponse({ status: 200, description: 'Jornada actual obtenida' })
  async getCurrentWorkday(@Request() req) {
    return await this.workdayService.getCurrentWorkday(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de jornadas' })
  @ApiResponse({ status: 200, description: 'Historial obtenido' })
  async getHistory(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.workdayService.getWorkdayHistory(req.user.id, start, end);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de jornadas' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStats(@Request() req, @Query() query: GetWorkdayStatsDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const agentId = query.agentId || req.user.id;
    return await this.workdayService.getWorkdayStats(agentId, startDate, endDate);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Obtener jornada actual de un agente específico (Admin)' })
  @ApiResponse({ status: 200, description: 'Jornada obtenida' })
  async getAgentWorkday(@Param('agentId') agentId: string) {
    return await this.workdayService.getCurrentWorkday(agentId);
  }

  @Get('attendance-report')
  @ApiOperation({ summary: 'Obtener reporte de asistencia de todos los agentes' })
  @ApiResponse({ status: 200, description: 'Reporte de asistencia obtenido' })
  async getAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('agentId') agentId?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    return await this.workdayService.getAttendanceReport(start, end, agentId);
  }

  @Get('all-agents-status')
  @ApiOperation({ summary: 'Obtener estado actual de todos los agentes' })
  @ApiResponse({ status: 200, description: 'Estado de agentes obtenido' })
  async getAllAgentsStatus() {
    return await this.workdayService.getAllAgentsCurrentStatus();
  }
}
