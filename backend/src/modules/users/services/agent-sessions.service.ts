import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AgentSession, AgentSessionStatus } from '../entities/agent-session.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AgentSessionsService {
  private readonly logger = new Logger(AgentSessionsService.name);

  constructor(
    @InjectRepository(AgentSession)
    private agentSessionRepository: Repository<AgentSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Crear nueva sesión (login)
   */
  async startSession(
    userId: string,
    status: AgentSessionStatus,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AgentSession> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['campaign'],
    });

    const session = this.agentSessionRepository.create({
      userId,
      status,
      startedAt: new Date(),
      ipAddress,
      userAgent,
      campaignId: user?.campaignId,
    });

    const saved = await this.agentSessionRepository.save(session);
    this.logger.log(`✅ Sesión iniciada para agente ${userId} con estado ${status}`);
    
    return saved;
  }

  /**
   * Finalizar sesión (logout)
   */
  async endSession(sessionId: string): Promise<AgentSession> {
    const session = await this.agentSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      this.logger.warn(`⚠️ Sesión ${sessionId} no encontrada`);
      return null;
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    session.endedAt = endedAt;
    session.durationSeconds = durationSeconds;

    await this.agentSessionRepository.save(session);
    this.logger.log(`✅ Sesión ${sessionId} finalizada. Duración: ${durationSeconds}s`);

    return session;
  }

  /**
   * Cambiar estado de sesión activa
   */
  async changeSessionStatus(
    userId: string,
    newStatus: AgentSessionStatus,
    reason?: string,
  ): Promise<AgentSession> {
    // Finalizar sesión activa anterior
    const activeSession = await this.getActiveSession(userId);
    if (activeSession) {
      await this.endSession(activeSession.id);
    }

    // Crear nueva sesión con el nuevo estado
    const session = this.agentSessionRepository.create({
      userId,
      status: newStatus,
      startedAt: new Date(),
      reason,
    });

    const saved = await this.agentSessionRepository.save(session);
    this.logger.log(`✅ Cambio de estado para ${userId}: ${newStatus}`);

    return saved;
  }

  /**
   * Obtener sesión activa de un agente
   */
  async getActiveSession(userId: string): Promise<AgentSession | null> {
    return await this.agentSessionRepository.findOne({
      where: {
        userId,
        endedAt: null as any,
      },
      order: {
        startedAt: 'DESC',
      },
    });
  }

  /**
   * Obtener historial de sesiones de un agente
   */
  async getAgentHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AgentSession[]> {
    const query = this.agentSessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .leftJoinAndSelect('session.campaign', 'campaign')
      .orderBy('session.startedAt', 'DESC');

    if (startDate && endDate) {
      query.andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await query.getMany();
  }

  /**
   * Obtener estadísticas de asistencia de un agente
   */
  async getAttendanceStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const sessions = await this.getAgentHistory(userId, startDate, endDate);

    const stats = {
      totalSessions: sessions.length,
      totalTimeSeconds: 0,
      timeByStatus: {
        available: 0,
        busy: 0,
        break: 0,
        offline: 0,
      },
      averageSessionDuration: 0,
      firstLogin: null as Date,
      lastLogout: null as Date,
    };

    sessions.forEach((session) => {
      if (session.durationSeconds) {
        stats.totalTimeSeconds += session.durationSeconds;
        stats.timeByStatus[session.status] += session.durationSeconds;
      }

      if (!stats.firstLogin || session.startedAt < stats.firstLogin) {
        stats.firstLogin = session.startedAt;
      }

      if (session.endedAt && (!stats.lastLogout || session.endedAt > stats.lastLogout)) {
        stats.lastLogout = session.endedAt;
      }
    });

    if (sessions.length > 0) {
      stats.averageSessionDuration = Math.floor(stats.totalTimeSeconds / sessions.length);
    }

    return stats;
  }

  /**
   * Obtener sesiones activas de todos los agentes
   */
  async getAllActiveSessions(): Promise<AgentSession[]> {
    return await this.agentSessionRepository.find({
      where: {
        endedAt: null as any,
      },
      relations: ['user', 'campaign'],
      order: {
        startedAt: 'DESC',
      },
    });
  }

  /**
   * Finalizar todas las sesiones activas (útil para mantenimiento)
   */
  async endAllActiveSessions(): Promise<number> {
    const activeSessions = await this.getAllActiveSessions();
    
    for (const session of activeSessions) {
      await this.endSession(session.id);
    }

    this.logger.log(`✅ Finalizadas ${activeSessions.length} sesiones activas`);
    return activeSessions.length;
  }

  /**
   * Limpiar sesiones huérfanas (sin endedAt después de 24 horas)
   */
  async cleanOrphanSessions(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const orphanSessions = await this.agentSessionRepository.find({
      where: {
        endedAt: null as any,
        startedAt: Between(new Date(0), yesterday) as any,
      },
    });

    for (const session of orphanSessions) {
      await this.endSession(session.id);
    }

    this.logger.log(`🧹 Limpiadas ${orphanSessions.length} sesiones huérfanas`);
    return orphanSessions.length;
  }
}
