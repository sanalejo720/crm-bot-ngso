import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AgentWorkday, WorkdayStatus } from './entities/agent-workday.entity';
import { AgentPause, PauseType } from './entities/agent-pause.entity';
import { AgentWorkdayEvent, WorkdayEventType } from './entities/agent-workday-event.entity';
import { User, AgentState } from '../users/entities/user.entity';

@Injectable()
export class WorkdayService {
  private readonly logger = new Logger(WorkdayService.name);

  constructor(
    @InjectRepository(AgentWorkday)
    private workdayRepository: Repository<AgentWorkday>,
    @InjectRepository(AgentPause)
    private pauseRepository: Repository<AgentPause>,
    @InjectRepository(AgentWorkdayEvent)
    private eventRepository: Repository<AgentWorkdayEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Registrar entrada del agente (Clock In)
   */
  async clockIn(agentId: string, notes?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya tiene una jornada activa hoy
    let workday = await this.workdayRepository.findOne({
      where: {
        agentId,
        workDate: today,
      },
    });

    if (workday && workday.clockInTime) {
      throw new BadRequestException('Ya has registrado tu entrada hoy');
    }

    const clockInTime = new Date();

    if (!workday) {
      // Crear nueva jornada
      workday = this.workdayRepository.create({
        agentId,
        workDate: today,
        clockInTime,
        currentStatus: WorkdayStatus.WORKING,
        notes,
      });
    } else {
      // Actualizar jornada existente
      workday.clockInTime = clockInTime;
      workday.currentStatus = WorkdayStatus.WORKING;
      if (notes) workday.notes = notes;
    }

    await this.workdayRepository.save(workday);

    // Registrar evento
    await this.createEvent(agentId, workday.id, WorkdayEventType.CLOCK_IN, {
      time: clockInTime,
      notes,
    });

    // Actualizar estado del agente a 'available'
    await this.userRepository.update(agentId, {
      agentState: AgentState.AVAILABLE,
    });

    this.logger.log(`✅ Agente ${agentId} registró entrada a las ${clockInTime.toLocaleTimeString()}`);

    return {
      success: true,
      workday,
      message: 'Entrada registrada exitosamente',
    };
  }

  /**
   * Registrar salida del agente (Clock Out)
   */
  async clockOut(agentId: string, notes?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workday = await this.workdayRepository.findOne({
      where: {
        agentId,
        workDate: today,
      },
      relations: ['pauses'],
    });

    if (!workday || !workday.clockInTime) {
      throw new BadRequestException('No has registrado tu entrada hoy');
    }

    if (workday.clockOutTime) {
      throw new BadRequestException('Ya has registrado tu salida hoy');
    }

    // Verificar si hay una pausa activa
    const activePause = await this.pauseRepository.findOne({
      where: {
        workdayId: workday.id,
        endTime: null,
      },
    });

    if (activePause) {
      // Finalizar pausa automáticamente
      await this.endPause(agentId, activePause.id);
    }

    const clockOutTime = new Date();
    const totalMinutes = Math.floor((clockOutTime.getTime() - workday.clockInTime.getTime()) / 60000);

    // Calcular tiempo en pausas
    const totalPauseMinutes = workday.pauses
      .filter(p => p.endTime)
      .reduce((sum, p) => sum + (p.durationMinutes || 0), 0);

    const totalProductiveMinutes = totalMinutes - totalPauseMinutes;

    workday.clockOutTime = clockOutTime;
    workday.totalWorkMinutes = totalMinutes;
    workday.totalPauseMinutes = totalPauseMinutes;
    workday.totalProductiveMinutes = totalProductiveMinutes;
    workday.currentStatus = WorkdayStatus.OFFLINE;
    if (notes) workday.notes = workday.notes ? `${workday.notes}\n${notes}` : notes;

    await this.workdayRepository.save(workday);

    // Registrar evento
    await this.createEvent(agentId, workday.id, WorkdayEventType.CLOCK_OUT, {
      time: clockOutTime,
      totalMinutes,
      totalPauseMinutes,
      totalProductiveMinutes,
      notes,
    });

    // Actualizar estado del agente a 'offline'
    await this.userRepository.update(agentId, {
      agentState: AgentState.OFFLINE,
    });

    this.logger.log(`✅ Agente ${agentId} registró salida. Tiempo trabajado: ${totalProductiveMinutes} minutos`);

    return {
      success: true,
      workday,
      summary: {
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
        pauseMinutes: totalPauseMinutes,
        productiveMinutes: totalProductiveMinutes,
      },
      message: 'Salida registrada exitosamente',
    };
  }

  /**
   * Iniciar pausa
   */
  async startPause(agentId: string, pauseType: PauseType, reason?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workday = await this.workdayRepository.findOne({
      where: {
        agentId,
        workDate: today,
      },
    });

    if (!workday || !workday.clockInTime) {
      throw new BadRequestException('Debes registrar tu entrada primero');
    }

    if (workday.clockOutTime) {
      throw new BadRequestException('Ya has registrado tu salida hoy');
    }

    // Verificar si ya hay una pausa activa y cerrarla automáticamente
    const activePause = await this.pauseRepository.findOne({
      where: {
        workdayId: workday.id,
        endTime: null,
      },
    });

    if (activePause) {
      // Cerrar la pausa activa automáticamente
      activePause.endTime = new Date();
      await this.pauseRepository.save(activePause);
      
      // Registrar evento de fin de pausa
      await this.createEvent(agentId, workday.id, WorkdayEventType.PAUSE_END, {
        pauseId: activePause.id,
        duration: Math.floor((activePause.endTime.getTime() - activePause.startTime.getTime()) / 1000 / 60),
      });
    }

    const startTime = new Date();

    const pause = this.pauseRepository.create({
      workdayId: workday.id,
      agentId,
      pauseType,
      startTime,
      reason,
    });

    await this.pauseRepository.save(pause);

    // Actualizar estado de la jornada
    workday.currentStatus = WorkdayStatus.ON_PAUSE;
    await this.workdayRepository.save(workday);

    // Registrar evento
    await this.createEvent(agentId, workday.id, WorkdayEventType.PAUSE_START, {
      pauseId: pause.id,
      pauseType,
      startTime,
      reason,
    });

    // Actualizar estado del agente
    await this.userRepository.update(agentId, {
      agentState: AgentState.BREAK,
    });

    this.logger.log(`⏸️ Agente ${agentId} inició pausa: ${pauseType}`);

    return {
      success: true,
      pause,
      message: `Pausa de ${pauseType} iniciada`,
    };
  }

  /**
   * Finalizar pausa
   */
  async endPause(agentId: string, pauseId: string) {
    const pause = await this.pauseRepository.findOne({
      where: { id: pauseId, agentId },
      relations: ['workday'],
    });

    if (!pause) {
      throw new NotFoundException('Pausa no encontrada');
    }

    if (pause.endTime) {
      throw new BadRequestException('Esta pausa ya fue finalizada');
    }

    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - pause.startTime.getTime()) / 60000);

    pause.endTime = endTime;
    pause.durationMinutes = durationMinutes;
    await this.pauseRepository.save(pause);

    // Actualizar estado de la jornada
    if (pause.workday) {
      pause.workday.currentStatus = WorkdayStatus.WORKING;
      await this.workdayRepository.save(pause.workday);
    }

    // Registrar evento
    await this.createEvent(agentId, pause.workdayId, WorkdayEventType.PAUSE_END, {
      pauseId: pause.id,
      pauseType: pause.pauseType,
      durationMinutes,
      endTime,
    });

    // Actualizar estado del agente a 'available'
    await this.userRepository.update(agentId, {
      agentState: AgentState.AVAILABLE,
    });

    this.logger.log(`▶️ Agente ${agentId} finalizó pausa. Duración: ${durationMinutes} minutos`);

    return {
      success: true,
      pause,
      duration: {
        minutes: durationMinutes,
        hours: Math.floor(durationMinutes / 60),
      },
      message: 'Pausa finalizada',
    };
  }

  /**
   * Obtener jornada actual del agente
   */
  async getCurrentWorkday(agentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workday = await this.workdayRepository.findOne({
      where: {
        agentId,
        workDate: today,
      },
      relations: ['pauses', 'agent'],
    });

    if (!workday) {
      return null;
    }

    // Calcular tiempos en tiempo real
    const now = new Date();
    const totalMinutesWorked = Math.floor((now.getTime() - workday.clockInTime.getTime()) / 60000);
    
    // Calcular tiempo total en pausas (incluyendo pausa activa)
    let totalPauseMinutes = 0;
    workday.pauses.forEach(pause => {
      if (pause.endTime) {
        // Pausa cerrada: usar duración calculada
        totalPauseMinutes += Math.floor((pause.endTime.getTime() - pause.startTime.getTime()) / 60000);
      } else {
        // Pausa activa: calcular desde startTime hasta ahora
        totalPauseMinutes += Math.floor((now.getTime() - pause.startTime.getTime()) / 60000);
      }
    });

    const totalProductiveMinutes = totalMinutesWorked - totalPauseMinutes;
    
    // Calcular pausa activa
    const activePause = workday.pauses.find(p => !p.endTime);

    return {
      ...workday,
      totalWorkMinutes: totalMinutesWorked,
      totalPauseMinutes,
      totalProductiveMinutes,
      activePause,
      isWorking: workday.currentStatus === WorkdayStatus.WORKING,
      isOnPause: workday.currentStatus === WorkdayStatus.ON_PAUSE,
    };
  }

  /**
   * Obtener historial de jornadas
   */
  async getWorkdayHistory(agentId: string, startDate?: Date, endDate?: Date) {
    const where: any = { agentId };

    if (startDate && endDate) {
      where.workDate = Between(startDate, endDate);
    }

    return await this.workdayRepository.find({
      where,
      relations: ['pauses'],
      order: { workDate: 'DESC' },
    });
  }

  /**
   * Obtener estadísticas de jornadas
   */
  async getWorkdayStats(agentId?: string, startDate?: Date, endDate?: Date) {
    const query = this.workdayRepository.createQueryBuilder('workday');

    if (agentId) {
      query.where('workday.agentId = :agentId', { agentId });
    }

    if (startDate && endDate) {
      query.andWhere('workday.workDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const workdays = await query.leftJoinAndSelect('workday.agent', 'agent').getMany();

    const stats = {
      totalDays: workdays.length,
      totalWorkMinutes: workdays.reduce((sum, w) => sum + w.totalWorkMinutes, 0),
      totalPauseMinutes: workdays.reduce((sum, w) => sum + w.totalPauseMinutes, 0),
      totalProductiveMinutes: workdays.reduce((sum, w) => sum + w.totalProductiveMinutes, 0),
      avgWorkMinutes: 0,
      avgPauseMinutes: 0,
      avgProductiveMinutes: 0,
    };

    if (stats.totalDays > 0) {
      stats.avgWorkMinutes = Math.floor(stats.totalWorkMinutes / stats.totalDays);
      stats.avgPauseMinutes = Math.floor(stats.totalPauseMinutes / stats.totalDays);
      stats.avgProductiveMinutes = Math.floor(stats.totalProductiveMinutes / stats.totalDays);
    }

    return {
      stats,
      workdays,
    };
  }

  /**
   * Crear evento de jornada
   */
  private async createEvent(
    agentId: string,
    workdayId: string,
    eventType: WorkdayEventType,
    eventData: any,
  ) {
    const event = this.eventRepository.create({
      agentId,
      workdayId,
      eventType,
      eventData,
    });

    return await this.eventRepository.save(event);
  }

  /**
   * Actualizar estadísticas de la jornada desde los chats
   */
  async updateWorkdayStats(agentId: string, chatsHandled: number, messagesSent: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workday = await this.workdayRepository.findOne({
      where: {
        agentId,
        workDate: today,
      },
    });

    if (workday) {
      workday.chatsHandled = chatsHandled;
      workday.messagesSent = messagesSent;
      await this.workdayRepository.save(workday);
    }
  }

  /**
   * Obtener reporte de asistencia para un rango de fechas
   */
  async getAttendanceReport(startDate: Date, endDate: Date, agentId?: string) {
    // Obtener todos los agentes por rol O que tengan isAgent = true
    let agents = await this.userRepository.find({
      where: [
        { role: { name: 'Agente' } },
        { isAgent: true },
      ],
      relations: ['role'],
    });

    // También buscar usuarios que tengan jornadas registradas (distinct agentIds)
    const workdaysAgentIds = await this.workdayRepository
      .createQueryBuilder('workday')
      .select('DISTINCT(workday.agentId)', 'agentId')
      .getRawMany();

    // Agregar agentes que tienen jornadas pero no están en la lista
    for (const wd of workdaysAgentIds) {
      if (wd.agentId && !agents.find(a => a.id === wd.agentId)) {
        const agent = await this.userRepository.findOne({ 
          where: { id: wd.agentId },
          relations: ['role']
        });
        if (agent) agents.push(agent);
      }
    }

    // Obtener jornadas en el rango
    const query = this.workdayRepository.createQueryBuilder('workday')
      .leftJoinAndSelect('workday.agent', 'agent')
      .leftJoinAndSelect('workday.pauses', 'pauses')
      .where('workday.workDate >= :startDate', { startDate })
      .andWhere('workday.workDate <= :endDate', { endDate });

    if (agentId) {
      query.andWhere('workday.agentId = :agentId', { agentId });
    }

    const workdays = await query.orderBy('workday.workDate', 'DESC').getMany();

    // Generar registros para cada día y cada agente
    const records: any[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // Para cada agente
      const targetAgents = agentId 
        ? agents.filter(a => a.id === agentId)
        : agents;

      for (const agent of targetAgents) {
        const workday = workdays.find(
          w => w.agentId === agent.id && 
          (w.workDate instanceof Date 
            ? w.workDate.toISOString().split('T')[0] 
            : String(w.workDate).split('T')[0]) === dateStr
        );

        // Calcular desglose de pausas
        let pauseBreakdown = { lunch: 0, break: 0, bathroom: 0, meeting: 0, other: 0 };
        if (workday?.pauses) {
          workday.pauses.forEach(p => {
            const type = p.pauseType as keyof typeof pauseBreakdown;
            if (pauseBreakdown[type] !== undefined) {
              pauseBreakdown[type] += p.durationMinutes || 0;
            }
          });
        }

        // Determinar estado
        let status = 'absent';
        if (isWeekend) {
          status = 'weekend';
        } else if (workday?.clockInTime) {
          const clockIn = new Date(workday.clockInTime);
          const expectedTime = new Date(clockIn);
          expectedTime.setHours(8, 0, 0, 0); // Hora esperada: 8:00 AM
          
          if (clockIn > expectedTime) {
            const minutesLate = Math.floor((clockIn.getTime() - expectedTime.getTime()) / 60000);
            status = minutesLate > 15 ? 'late' : 'present';
          } else {
            status = 'present';
          }
        }

        // Solo agregar si no es un día futuro
        if (currentDate <= today) {
          // Formatear hora en zona horaria de Colombia (UTC-5)
          const formatTimeColombia = (date: Date | string | null): string | null => {
            if (!date) return null;
            const d = new Date(date);
            return d.toLocaleTimeString('es-CO', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Bogota',
              hour12: true 
            });
          };

          records.push({
            agentId: agent.id,
            agentName: agent.fullName || agent.email,
            email: agent.email,
            date: dateStr,
            status,
            clockInTime: formatTimeColombia(workday?.clockInTime),
            clockOutTime: formatTimeColombia(workday?.clockOutTime),
            totalWorkMinutes: workday?.totalWorkMinutes || 0,
            totalPauseMinutes: workday?.totalPauseMinutes || 0,
            totalProductiveMinutes: workday?.totalProductiveMinutes || 0,
            chatsHandled: workday?.chatsHandled || 0,
            pauseBreakdown,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calcular resumen
    const presentRecords = records.filter(r => r.status === 'present' || r.status === 'late');
    const absentRecords = records.filter(r => r.status === 'absent');
    const lateRecords = records.filter(r => r.status === 'late');

    const summary = {
      totalAgents: agents.length,
      presentToday: presentRecords.filter(r => r.date === today.toISOString().split('T')[0]).length,
      absentToday: absentRecords.filter(r => r.date === today.toISOString().split('T')[0]).length,
      lateToday: lateRecords.filter(r => r.date === today.toISOString().split('T')[0]).length,
      onPauseNow: 0, // Se puede calcular con estado actual
      avgWorkHours: presentRecords.length > 0 
        ? presentRecords.reduce((sum, r) => sum + r.totalWorkMinutes, 0) / presentRecords.length / 60
        : 0,
      avgProductiveHours: presentRecords.length > 0
        ? presentRecords.reduce((sum, r) => sum + r.totalProductiveMinutes, 0) / presentRecords.length / 60
        : 0,
    };

    return {
      records,
      summary,
    };
  }

  /**
   * Obtener estado actual de todos los agentes
   */
  async getAllAgentsCurrentStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agents = await this.userRepository.find({
      where: { role: { name: 'Agente' } },
      relations: ['role'],
    });

    const statuses = await Promise.all(
      agents.map(async (agent) => {
        const workday = await this.getCurrentWorkday(agent.id);
        return {
          agentId: agent.id,
          agentName: agent.fullName || agent.email,
          agentState: agent.agentState,
          isOnline: !!workday?.clockInTime && !workday?.clockOutTime,
          workday: workday ? {
            clockInTime: workday.clockInTime,
            currentStatus: workday.currentStatus,
            totalWorkMinutes: workday.totalWorkMinutes,
            totalPauseMinutes: workday.totalPauseMinutes,
            activePause: workday.activePause,
          } : null,
        };
      })
    );

    return {
      success: true,
      data: statuses,
    };
  }
}
