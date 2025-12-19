import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { Message, MessageDirection } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { AgentSession } from '../users/entities/agent-session.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Client } from '../clients/entities/client.entity';
import { PaymentRecord, PaymentSource, PaymentStatus } from './entities/payment-record.entity';

/**
 * Servicio de métricas avanzadas para el CRM
 * Implementa métricas profesionales de call center
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(PaymentRecord)
    private paymentRecordRepository: Repository<PaymentRecord>,
  ) {}

  // ==================== MÉTRICAS DE AGENTE ====================

  /**
   * TMO - Tiempo Medio de Operación por chat
   * Tiempo promedio que un agente tarda en resolver un chat
   */
  async getAgentTMO(
    agentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ tmoMinutes: number; totalChats: number }> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.status IN (:...statuses)', { 
        statuses: ['closed', 'resolved'] 
      })
      .andWhere('chat.assignedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('chat.closedAt IS NOT NULL')
      .getMany();

    if (chats.length === 0) {
      return { tmoMinutes: 0, totalChats: 0 };
    }

    let totalMinutes = 0;
    for (const chat of chats) {
      if (chat.assignedAt && chat.closedAt) {
        const duration = (chat.closedAt.getTime() - chat.assignedAt.getTime()) / 60000;
        totalMinutes += duration;
      }
    }

    return {
      tmoMinutes: Math.round((totalMinutes / chats.length) * 100) / 100,
      totalChats: chats.length,
    };
  }

  /**
   * FRT - First Response Time
   * Tiempo promedio hasta la primera respuesta del agente
   */
  async getAgentFRT(
    agentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ frtSeconds: number; totalChats: number }> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.assignedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('chat.firstResponseAt IS NOT NULL')
      .getMany();

    if (chats.length === 0) {
      return { frtSeconds: 0, totalChats: 0 };
    }

    let totalSeconds = 0;
    for (const chat of chats) {
      if (chat.assignedAt && chat.firstResponseAt) {
        const duration = (chat.firstResponseAt.getTime() - chat.assignedAt.getTime()) / 1000;
        totalSeconds += duration;
      }
    }

    return {
      frtSeconds: Math.round(totalSeconds / chats.length),
      totalChats: chats.length,
    };
  }

  /**
   * Métricas completas de un agente
   */
  async getAgentMetrics(
    agentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    agentId: string;
    agentName: string;
    period: { start: Date; end: Date };
    chats: {
      total: number;
      active: number;
      closed: number;
      resolved: number;
    };
    messages: {
      sent: number;
      received: number;
    };
    performance: {
      tmoMinutes: number;
      frtSeconds: number;
      avgMessagesPerChat: number;
      closureRate: number;
    };
    session: {
      totalTimeHours: number;
      avgSessionDuration: number;
      totalSessions: number;
    };
  }> {
    const agent = await this.userRepository.findOne({ where: { id: agentId } });
    if (!agent) throw new Error(`Agente ${agentId} no encontrado`);

    // Chats del agente
    const [total, active, closed, resolved] = await Promise.all([
      this.chatRepository.count({
        where: {
          assignedAgentId: agentId,
          createdAt: Between(startDate, endDate),
        },
      }),
      this.chatRepository.count({
        where: {
          assignedAgentId: agentId,
          status: ChatStatus.ACTIVE,
          createdAt: Between(startDate, endDate),
        },
      }),
      this.chatRepository.count({
        where: {
          assignedAgentId: agentId,
          status: ChatStatus.CLOSED,
          createdAt: Between(startDate, endDate),
        },
      }),
      this.chatRepository.count({
        where: {
          assignedAgentId: agentId,
          status: ChatStatus.RESOLVED,
          createdAt: Between(startDate, endDate),
        },
      }),
    ]);

    // Mensajes
    const chatIds = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.id')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const chatIdsList = chatIds.map(c => c.id);

    let sent = 0;
    let received = 0;
    if (chatIdsList.length > 0) {
      [sent, received] = await Promise.all([
        this.messageRepository.count({
          where: {
            chatId: chatIdsList.length > 0 ? chatIdsList[0] : undefined,
            direction: MessageDirection.OUTBOUND,
            senderId: agentId,
          },
        }),
        this.messageRepository.count({
          where: {
            chatId: chatIdsList.length > 0 ? chatIdsList[0] : undefined,
            direction: MessageDirection.INBOUND,
          },
        }),
      ]);
    }

    // Performance
    const tmo = await this.getAgentTMO(agentId, startDate, endDate);
    const frt = await this.getAgentFRT(agentId, startDate, endDate);
    const avgMessagesPerChat = total > 0 ? Math.round((sent + received) / total) : 0;
    const closureRate = total > 0 ? ((closed + resolved) / total) * 100 : 0;

    // Sesiones
    const sessions = await this.sessionRepository.find({
      where: {
        userId: agentId,
        startedAt: Between(startDate, endDate),
      },
    });

    const totalTimeSeconds = sessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 0),
      0
    );
    const avgSessionDuration = sessions.length > 0
      ? Math.round(totalTimeSeconds / sessions.length)
      : 0;

    return {
      agentId,
      agentName: agent.fullName,
      period: { start: startDate, end: endDate },
      chats: { total, active, closed, resolved },
      messages: { sent, received },
      performance: {
        tmoMinutes: tmo.tmoMinutes,
        frtSeconds: frt.frtSeconds,
        avgMessagesPerChat,
        closureRate: Math.round(closureRate * 100) / 100,
      },
      session: {
        totalTimeHours: Math.round((totalTimeSeconds / 3600) * 100) / 100,
        avgSessionDuration,
        totalSessions: sessions.length,
      },
    };
  }

  // ==================== MÉTRICAS DE CAMPAÑA ====================

  /**
   * Métricas completas de una campaña
   */
  async getCampaignMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    campaignId: string;
    campaignName: string;
    period: { start: Date; end: Date };
    chats: {
      total: number;
      attended: number;
      unattended: number;
      botOnly: number;
      transferred: number;
    };
    queue: {
      avgWaitTimeSeconds: number;
      maxWaitTimeSeconds: number;
      currentInQueue: number;
    };
    agents: {
      total: number;
      available: number;
      loadDistribution: Array<{ agentId: string; agentName: string; chatCount: number }>;
    };
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error(`Campaña ${campaignId} no encontrada`);

    // Chats de la campaña
    const [total, botOnly, transferred] = await Promise.all([
      this.chatRepository.count({
        where: {
          campaignId,
          createdAt: Between(startDate, endDate),
        },
      }),
      this.chatRepository.count({
        where: {
          campaignId,
          assignedAgentId: null as any,
          status: ChatStatus.CLOSED,
          createdAt: Between(startDate, endDate),
        },
      }),
      this.chatRepository.count({
        where: {
          campaignId,
          createdAt: Between(startDate, endDate),
        },
      }),
    ]);

    // Chats atendidos vs no atendidos
    const attended = await this.chatRepository.count({
      where: {
        campaignId,
        createdAt: Between(startDate, endDate),
      },
    });
    const unattended = total - attended - botOnly;

    // Cola actual
    const currentInQueue = await this.chatRepository.count({
      where: {
        campaignId,
        status: ChatStatus.BOT,
        subStatus: 'bot_waiting_queue',
      },
    });

    // Tiempos de espera
    const waitingChats = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('chat.assignedAt IS NOT NULL')
      .andWhere('chat.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    let totalWaitTime = 0;
    let maxWaitTime = 0;
    for (const chat of waitingChats) {
      if (chat.assignedAt && chat.createdAt) {
        const waitTime = (chat.assignedAt.getTime() - chat.createdAt.getTime()) / 1000;
        totalWaitTime += waitTime;
        if (waitTime > maxWaitTime) maxWaitTime = waitTime;
      }
    }
    const avgWaitTime = waitingChats.length > 0 
      ? Math.round(totalWaitTime / waitingChats.length) 
      : 0;

    // Agentes de la campaña
    const agents = await this.userRepository.find({
      where: {
        campaignId,
        isAgent: true,
      },
    });

    const available = agents.filter(a => a.agentState === 'available').length;

    // Distribución de carga
    const loadDistribution: Array<{ agentId: string; agentName: string; chatCount: number }> = [];
    for (const agent of agents) {
      const chatCount = await this.chatRepository.count({
        where: {
          assignedAgentId: agent.id,
          status: ChatStatus.ACTIVE,
        },
      });
      loadDistribution.push({
        agentId: agent.id,
        agentName: agent.fullName,
        chatCount,
      });
    }

    // Ordenar por carga
    loadDistribution.sort((a, b) => b.chatCount - a.chatCount);

    return {
      campaignId,
      campaignName: campaign.name,
      period: { start: startDate, end: endDate },
      chats: {
        total,
        attended,
        unattended: unattended > 0 ? unattended : 0,
        botOnly,
        transferred,
      },
      queue: {
        avgWaitTimeSeconds: avgWaitTime,
        maxWaitTimeSeconds: Math.round(maxWaitTime),
        currentInQueue,
      },
      agents: {
        total: agents.length,
        available,
        loadDistribution,
      },
    };
  }

  // ==================== MÉTRICAS DE BOT ====================

  /**
   * Métricas del bot
   */
  async getBotMetrics(
    campaignId: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { start: Date; end: Date };
    resolution: {
      totalChats: number;
      resolvedByBot: number;
      transferredToAgent: number;
      resolutionRate: number;
    };
    dropRate: {
      totalStarted: number;
      abandoned: number;
      dropRate: number;
    };
    performance: {
      avgBotInteractions: number;
      avgTimeInBotSeconds: number;
    };
  }> {
    const query = this.chatRepository.createQueryBuilder('chat');
    
    query.where('chat.createdAt BETWEEN :startDate AND :endDate', {
      startDate,
      endDate,
    });

    if (campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId });
    }

    const allChats = await query.getMany();
    const totalChats = allChats.length;

    // Resueltos solo por bot (cerrados sin agente)
    const resolvedByBot = allChats.filter(
      c => c.status === ChatStatus.CLOSED && !c.assignedAgentId
    ).length;

    // Transferidos a agente
    const transferredToAgent = allChats.filter(
      c => c.assignedAgentId !== null
    ).length;

    // Tasa de resolución del bot
    const resolutionRate = totalChats > 0 
      ? (resolvedByBot / totalChats) * 100 
      : 0;

    // Drop rate (abandonos en flujo de bot)
    const abandoned = allChats.filter(
      c => c.status === ChatStatus.BOT && 
           c.subStatus !== 'bot_waiting_queue' &&
           !c.assignedAgentId
    ).length;
    const dropRate = totalChats > 0 
      ? (abandoned / totalChats) * 100 
      : 0;

    // Tiempo promedio en bot
    let totalBotTime = 0;
    let botInteractions = 0;
    for (const chat of allChats) {
      if (chat.botContext) {
        botInteractions += (chat.botContext as any).interactionCount || 0;
      }
      if (chat.assignedAt && chat.createdAt) {
        totalBotTime += (chat.assignedAt.getTime() - chat.createdAt.getTime()) / 1000;
      }
    }
    const avgBotInteractions = totalChats > 0 
      ? Math.round(botInteractions / totalChats) 
      : 0;
    const avgTimeInBot = transferredToAgent > 0 
      ? Math.round(totalBotTime / transferredToAgent) 
      : 0;

    return {
      period: { start: startDate, end: endDate },
      resolution: {
        totalChats,
        resolvedByBot,
        transferredToAgent,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
      },
      dropRate: {
        totalStarted: totalChats,
        abandoned,
        dropRate: Math.round(dropRate * 100) / 100,
      },
      performance: {
        avgBotInteractions,
        avgTimeInBotSeconds: avgTimeInBot,
      },
    };
  }

  // ==================== DASHBOARD CONSOLIDADO ====================

  /**
   * Dashboard completo para supervisores
   */
  async getSupervisorDashboard(
    campaignId: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Métricas generales
    const query = this.chatRepository.createQueryBuilder('chat');
    query.where('chat.createdAt BETWEEN :startDate AND :endDate', {
      startDate,
      endDate,
    });
    if (campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId });
    }

    const [
      totalChats,
      activeChats,
      closedChats,
      inQueueChats,
    ] = await Promise.all([
      query.clone().getCount(),
      query.clone().andWhere('chat.status = :status', { status: 'active' }).getCount(),
      query.clone().andWhere('chat.status = :status', { status: 'closed' }).getCount(),
      query.clone()
        .andWhere('chat.status = :status', { status: 'bot' })
        .andWhere('chat.subStatus = :subStatus', { subStatus: 'bot_waiting_queue' })
        .getCount(),
    ]);

    // Agentes disponibles
    const agentsQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.isAgent = :isAgent', { isAgent: true })
      .andWhere('user.status = :status', { status: 'active' });

    if (campaignId) {
      agentsQuery.andWhere('user.campaignId = :campaignId', { campaignId });
    }

    const agents = await agentsQuery.getMany();
    const availableAgents = agents.filter(a => a.agentState === 'available').length;
    const busyAgents = agents.filter(a => a.agentState === 'busy').length;
    const onBreakAgents = agents.filter(a => a.agentState === 'break').length;

    // Métricas del bot
    const botMetrics = await this.getBotMetrics(campaignId, startDate, endDate);

    return {
      summary: {
        totalChats,
        activeChats,
        closedChats,
        inQueueChats,
        closureRate: totalChats > 0 
          ? Math.round((closedChats / totalChats) * 100 * 100) / 100 
          : 0,
      },
      agents: {
        total: agents.length,
        available: availableAgents,
        busy: busyAgents,
        onBreak: onBreakAgents,
        offline: agents.length - availableAgents - busyAgents - onBreakAgents,
      },
      bot: {
        resolutionRate: botMetrics.resolution.resolutionRate,
        dropRate: botMetrics.dropRate.dropRate,
        transferRate: totalChats > 0 
          ? Math.round((botMetrics.resolution.transferredToAgent / totalChats) * 100 * 100) / 100 
          : 0,
      },
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // ==================== MÉTRICAS DE RECAUDO ====================

  /**
   * Registrar un pago
   */
  async recordPayment(dto: {
    clientId: string;
    agentId?: string;
    campaignId?: string;
    amount: number;
    paymentDate: string;
    source?: PaymentSource;
    status?: PaymentStatus;
    referenceId?: string;
    notes?: string;
  }, recordedBy?: string): Promise<PaymentRecord> {
    // Obtener el cliente para calcular porcentajes
    const client = await this.clientRepository.findOne({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    }

    const originalDebt = Number(client.originalDebtAmount || client.debtAmount || 0);
    const currentDebt = Number(client.debtAmount || 0);
    const paymentAmount = Number(dto.amount);
    const remainingDebt = Math.max(0, currentDebt - paymentAmount);
    const recoveryPercentage = originalDebt > 0 
      ? (paymentAmount / originalDebt) * 100 
      : 100;

    // Crear registro de pago
    const paymentRecord = this.paymentRecordRepository.create({
      clientId: dto.clientId,
      agentId: dto.agentId || recordedBy,
      campaignId: dto.campaignId || client.campaignId,
      amount: paymentAmount,
      originalDebt,
      remainingDebt,
      recoveryPercentage: Math.min(recoveryPercentage, 100),
      paymentDate: new Date(dto.paymentDate),
      source: dto.source || PaymentSource.MANUAL,
      status: dto.status || PaymentStatus.CONFIRMED,
      referenceId: dto.referenceId,
      notes: dto.notes,
      metadata: {
        documentNumber: client.documentNumber,
      },
    });

    await this.paymentRecordRepository.save(paymentRecord);

    // Actualizar el cliente
    await this.clientRepository.update(dto.clientId, {
      debtAmount: remainingDebt,
      lastPaymentAmount: paymentAmount,
      lastPaymentDate: new Date(dto.paymentDate),
      collectionStatus: remainingDebt <= 0 ? 'paid' : 'partial',
    });

    this.logger.log(
      `💰 Pago registrado: ${paymentAmount} del cliente ${client.fullName} (${recoveryPercentage.toFixed(2)}% recuperado)`,
    );

    return paymentRecord;
  }

  /**
   * Obtener métricas generales de recaudo
   */
  async getCollectionMetrics(filters: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
    campaignId?: string;
  }): Promise<{
    totalCollected: number;
    totalDebtAssigned: number;
    recoveryPercentage: number;
    paymentsCount: number;
    averagePayment: number;
  }> {
    const whereConditions: any = {
      status: PaymentStatus.CONFIRMED,
    };

    if (filters.startDate && filters.endDate) {
      whereConditions.paymentDate = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    } else if (filters.startDate) {
      whereConditions.paymentDate = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      whereConditions.paymentDate = LessThanOrEqual(new Date(filters.endDate));
    }

    if (filters.agentId) {
      whereConditions.agentId = filters.agentId;
    }

    if (filters.campaignId) {
      whereConditions.campaignId = filters.campaignId;
    }

    const payments = await this.paymentRecordRepository.find({
      where: whereConditions,
    });

    const totalCollected = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalDebtAssigned = payments.reduce(
      (sum, p) => sum + Number(p.originalDebt),
      0,
    );
    const paymentsCount = payments.length;
    const averagePayment = paymentsCount > 0 ? totalCollected / paymentsCount : 0;
    const recoveryPercentage = totalDebtAssigned > 0
      ? (totalCollected / totalDebtAssigned) * 100
      : 0;

    return {
      totalCollected,
      totalDebtAssigned,
      recoveryPercentage,
      paymentsCount,
      averagePayment,
    };
  }

  /**
   * Obtener métricas de recaudo por agente (ranking)
   */
  async getAgentCollectionMetrics(filters: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }): Promise<Array<{
    agentId: string;
    agentName: string;
    totalCollected: number;
    totalAssigned: number;
    recoveryPercentage: number;
    paymentsCount: number;
    ranking: number;
  }>> {
    const queryBuilder = this.paymentRecordRepository
      .createQueryBuilder('payment')
      .select('payment.agentId', 'agentId')
      .addSelect('SUM(payment.amount)', 'totalCollected')
      .addSelect('SUM(payment.originalDebt)', 'totalAssigned')
      .addSelect('COUNT(*)', 'paymentsCount')
      .leftJoin('users', 'agent', 'agent.id = payment.agentId')
      .addSelect('agent.fullName', 'agentName')
      .where('payment.status = :status', { status: PaymentStatus.CONFIRMED })
      .groupBy('payment.agentId')
      .addGroupBy('agent.fullName')
      .orderBy('SUM(payment.amount)', 'DESC');

    if (filters.startDate) {
      queryBuilder.andWhere('payment.paymentDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('payment.paymentDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.campaignId) {
      queryBuilder.andWhere('payment.campaignId = :campaignId', {
        campaignId: filters.campaignId,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((r, index) => ({
      agentId: r.agentId,
      agentName: r.agentName || 'Sin asignar',
      totalCollected: Number(r.totalCollected) || 0,
      totalAssigned: Number(r.totalAssigned) || 0,
      recoveryPercentage: r.totalAssigned > 0
        ? (Number(r.totalCollected) / Number(r.totalAssigned)) * 100
        : 0,
      paymentsCount: Number(r.paymentsCount) || 0,
      ranking: index + 1,
    }));
  }

  /**
   * Obtener métricas de recaudo en serie de tiempo
   */
  async getCollectionTimeSeries(filters: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
    campaignId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<Array<{
    date: string;
    totalCollected: number;
    paymentsCount: number;
    recoveryPercentage: number;
  }>> {
    const groupBy = filters.groupBy || 'day';
    
    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = "TO_CHAR(payment.paymentDate, 'IYYY-IW')";
        break;
      case 'month':
        dateFormat = "TO_CHAR(payment.paymentDate, 'YYYY-MM')";
        break;
      default:
        dateFormat = "TO_CHAR(payment.paymentDate, 'YYYY-MM-DD')";
    }

    const queryBuilder = this.paymentRecordRepository
      .createQueryBuilder('payment')
      .select(dateFormat, 'date')
      .addSelect('SUM(payment.amount)', 'totalCollected')
      .addSelect('SUM(payment.originalDebt)', 'totalAssigned')
      .addSelect('COUNT(*)', 'paymentsCount')
      .where('payment.status = :status', { status: PaymentStatus.CONFIRMED })
      .groupBy(dateFormat)
      .orderBy(dateFormat, 'ASC');

    if (filters.startDate) {
      queryBuilder.andWhere('payment.paymentDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('payment.paymentDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.agentId) {
      queryBuilder.andWhere('payment.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    if (filters.campaignId) {
      queryBuilder.andWhere('payment.campaignId = :campaignId', {
        campaignId: filters.campaignId,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((r) => ({
      date: r.date,
      totalCollected: Number(r.totalCollected) || 0,
      paymentsCount: Number(r.paymentsCount) || 0,
      recoveryPercentage: r.totalAssigned > 0
        ? (Number(r.totalCollected) / Number(r.totalAssigned)) * 100
        : 0,
    }));
  }

  /**
   * Obtener resumen de cartera
   */
  async getPortfolioSummary(campaignId?: string): Promise<{
    totalPortfolio: number;
    totalCollected: number;
    totalPending: number;
    recoveryPercentage: number;
    clientsCount: number;
    paidClients: number;
    pendingClients: number;
  }> {
    const clientQuery = this.clientRepository.createQueryBuilder('client');

    if (campaignId) {
      clientQuery.where('client.campaignId = :campaignId', { campaignId });
    }

    const clients = await clientQuery.getMany();

    const totalPortfolio = clients.reduce(
      (sum, c) => sum + Number(c.originalDebtAmount || c.debtAmount || 0),
      0,
    );
    const totalPending = clients.reduce(
      (sum, c) => sum + Number(c.debtAmount || 0),
      0,
    );
    const totalCollected = totalPortfolio - totalPending;
    const paidClients = clients.filter(c => c.collectionStatus === 'paid').length;
    const pendingClients = clients.filter(c => c.collectionStatus !== 'paid').length;

    return {
      totalPortfolio,
      totalCollected,
      totalPending,
      recoveryPercentage: totalPortfolio > 0 ? (totalCollected / totalPortfolio) * 100 : 0,
      clientsCount: clients.length,
      paidClients,
      pendingClients,
    };
  }
}
