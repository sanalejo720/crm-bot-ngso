"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WorkdayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkdayService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_workday_entity_1 = require("./entities/agent-workday.entity");
const agent_pause_entity_1 = require("./entities/agent-pause.entity");
const agent_workday_event_entity_1 = require("./entities/agent-workday-event.entity");
const user_entity_1 = require("../users/entities/user.entity");
let WorkdayService = WorkdayService_1 = class WorkdayService {
    constructor(workdayRepository, pauseRepository, eventRepository, userRepository) {
        this.workdayRepository = workdayRepository;
        this.pauseRepository = pauseRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(WorkdayService_1.name);
    }
    /**
     * Registrar entrada del agente (Clock In)
     */
    async clockIn(agentId, notes) {
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
            throw new common_1.BadRequestException('Ya has registrado tu entrada hoy');
        }
        const clockInTime = new Date();
        if (!workday) {
            // Crear nueva jornada
            workday = this.workdayRepository.create({
                agentId,
                workDate: today,
                clockInTime,
                currentStatus: agent_workday_entity_1.WorkdayStatus.WORKING,
                notes,
            });
        }
        else {
            // Actualizar jornada existente
            workday.clockInTime = clockInTime;
            workday.currentStatus = agent_workday_entity_1.WorkdayStatus.WORKING;
            if (notes)
                workday.notes = notes;
        }
        await this.workdayRepository.save(workday);
        // Registrar evento
        await this.createEvent(agentId, workday.id, agent_workday_event_entity_1.WorkdayEventType.CLOCK_IN, {
            time: clockInTime,
            notes,
        });
        // Actualizar estado del agente a 'available'
        await this.userRepository.update(agentId, {
            agentState: user_entity_1.AgentState.AVAILABLE,
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
    async clockOut(agentId, notes) {
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
            throw new common_1.BadRequestException('No has registrado tu entrada hoy');
        }
        if (workday.clockOutTime) {
            throw new common_1.BadRequestException('Ya has registrado tu salida hoy');
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
        workday.currentStatus = agent_workday_entity_1.WorkdayStatus.OFFLINE;
        if (notes)
            workday.notes = workday.notes ? `${workday.notes}\n${notes}` : notes;
        await this.workdayRepository.save(workday);
        // Registrar evento
        await this.createEvent(agentId, workday.id, agent_workday_event_entity_1.WorkdayEventType.CLOCK_OUT, {
            time: clockOutTime,
            totalMinutes,
            totalPauseMinutes,
            totalProductiveMinutes,
            notes,
        });
        // Actualizar estado del agente a 'offline'
        await this.userRepository.update(agentId, {
            agentState: user_entity_1.AgentState.OFFLINE,
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
    async startPause(agentId, pauseType, reason) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const workday = await this.workdayRepository.findOne({
            where: {
                agentId,
                workDate: today,
            },
        });
        if (!workday || !workday.clockInTime) {
            throw new common_1.BadRequestException('Debes registrar tu entrada primero');
        }
        if (workday.clockOutTime) {
            throw new common_1.BadRequestException('Ya has registrado tu salida hoy');
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
            await this.createEvent(agentId, workday.id, agent_workday_event_entity_1.WorkdayEventType.PAUSE_END, {
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
        workday.currentStatus = agent_workday_entity_1.WorkdayStatus.ON_PAUSE;
        await this.workdayRepository.save(workday);
        // Registrar evento
        await this.createEvent(agentId, workday.id, agent_workday_event_entity_1.WorkdayEventType.PAUSE_START, {
            pauseId: pause.id,
            pauseType,
            startTime,
            reason,
        });
        // Actualizar estado del agente
        await this.userRepository.update(agentId, {
            agentState: user_entity_1.AgentState.BREAK,
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
    async endPause(agentId, pauseId) {
        const pause = await this.pauseRepository.findOne({
            where: { id: pauseId, agentId },
            relations: ['workday'],
        });
        if (!pause) {
            throw new common_1.NotFoundException('Pausa no encontrada');
        }
        if (pause.endTime) {
            throw new common_1.BadRequestException('Esta pausa ya fue finalizada');
        }
        const endTime = new Date();
        const durationMinutes = Math.floor((endTime.getTime() - pause.startTime.getTime()) / 60000);
        pause.endTime = endTime;
        pause.durationMinutes = durationMinutes;
        await this.pauseRepository.save(pause);
        // Actualizar estado de la jornada
        if (pause.workday) {
            pause.workday.currentStatus = agent_workday_entity_1.WorkdayStatus.WORKING;
            await this.workdayRepository.save(pause.workday);
        }
        // Registrar evento
        await this.createEvent(agentId, pause.workdayId, agent_workday_event_entity_1.WorkdayEventType.PAUSE_END, {
            pauseId: pause.id,
            pauseType: pause.pauseType,
            durationMinutes,
            endTime,
        });
        // Actualizar estado del agente a 'available'
        await this.userRepository.update(agentId, {
            agentState: user_entity_1.AgentState.AVAILABLE,
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
    async getCurrentWorkday(agentId) {
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
            }
            else {
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
            isWorking: workday.currentStatus === agent_workday_entity_1.WorkdayStatus.WORKING,
            isOnPause: workday.currentStatus === agent_workday_entity_1.WorkdayStatus.ON_PAUSE,
        };
    }
    /**
     * Obtener historial de jornadas
     */
    async getWorkdayHistory(agentId, startDate, endDate) {
        const where = { agentId };
        if (startDate && endDate) {
            where.workDate = (0, typeorm_2.Between)(startDate, endDate);
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
    async getWorkdayStats(agentId, startDate, endDate) {
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
    async createEvent(agentId, workdayId, eventType, eventData) {
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
    async updateWorkdayStats(agentId, chatsHandled, messagesSent) {
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
};
exports.WorkdayService = WorkdayService;
exports.WorkdayService = WorkdayService = WorkdayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_workday_entity_1.AgentWorkday)),
    __param(1, (0, typeorm_1.InjectRepository)(agent_pause_entity_1.AgentPause)),
    __param(2, (0, typeorm_1.InjectRepository)(agent_workday_event_entity_1.AgentWorkdayEvent)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], WorkdayService);
