import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { Message, MessageDirection } from '../messages/entities/message.entity';
import { User, AgentState } from '../users/entities/user.entity';
import { Client, LeadStatus } from '../clients/entities/client.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalChats: number;
  activeChats: number;
  resolvedChats: number;
  totalMessages: number;
  averageResponseTime: number; // TMR en segundos
  averageHandlingTime: number; // TMO en segundos
  sentMessagesPerHour: number; // SPH
  satisfactionRate?: number;
  state: AgentState;
}

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  resolvedChats: number;
  totalClients: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  averageResponseTime: number;
  averageHandlingTime: number;
}

export interface SystemMetrics {
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  botChats: number;
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  offlineAgents: number;
  totalMessages24h: number;
  averageResponseTime: number;
  queueSize: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * Obtener métricas del sistema en tiempo real
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalChats,
      activeChats,
      waitingChats,
      botChats,
      totalAgents,
      availableAgents,
      busyAgents,
      offlineAgents,
      totalMessages24h,
    ] = await Promise.all([
      this.chatRepository.count(),
      this.chatRepository.count({ where: { status: ChatStatus.ACTIVE } }),
      this.chatRepository.count({ where: { status: ChatStatus.WAITING } }),
      this.chatRepository.count({ where: { status: ChatStatus.BOT } }),
      this.userRepository.count({ where: { isAgent: true } }),
      this.userRepository.count({ where: { isAgent: true, agentState: AgentState.AVAILABLE } }),
      this.userRepository.count({ where: { isAgent: true, agentState: AgentState.BUSY } }),
      this.userRepository.count({ where: { isAgent: true, agentState: AgentState.OFFLINE } }),
      this.messageRepository.count({ where: { createdAt: Between(yesterday, now) } }),
    ]);

    // Calcular TMR promedio (últimas 24h)
    const averageResponseTime = await this.calculateAverageResponseTime({ startDate: yesterday, endDate: now });

    return {
      totalChats,
      activeChats,
      waitingChats,
      botChats,
      totalAgents,
      availableAgents,
      busyAgents,
      offlineAgents,
      totalMessages24h,
      averageResponseTime,
      queueSize: waitingChats,
    };
  }

  /**
   * Obtener métricas por agente
   */
  async getAgentMetrics(agentId: string, dateRange?: DateRange): Promise<AgentMetrics> {
    const agent = await this.userRepository.findOne({ where: { id: agentId } });

    if (!agent) {
      throw new Error(`Agente ${agentId} no encontrado`);
    }

    const query = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.assignedAgentId = :agentId', { agentId });

    if (dateRange) {
      query.andWhere('chat.createdAt BETWEEN :startDate AND :endDate', dateRange);
    }

    const totalChats = await query.getCount();
    const activeChats = await query.clone().andWhere('chat.status = :status', { status: ChatStatus.ACTIVE }).getCount();
    const resolvedChats = await query.clone().andWhere('chat.status = :status', { status: ChatStatus.RESOLVED }).getCount();

    // Total de mensajes enviados por el agente
    const messageQuery = this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND });

    if (dateRange) {
      messageQuery.andWhere('message.createdAt BETWEEN :startDate AND :endDate', dateRange);
    }

    const totalMessages = await messageQuery.getCount();

    // TMR y TMO
    const averageResponseTime = await this.calculateAgentResponseTime(agentId, dateRange);
    const averageHandlingTime = await this.calculateAgentHandlingTime(agentId, dateRange);

    // SPH (mensajes por hora)
    const hoursInPeriod = dateRange
      ? (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60)
      : 24;
    const sentMessagesPerHour = totalMessages / hoursInPeriod;

    return {
      agentId: agent.id,
      agentName: agent.fullName,
      totalChats,
      activeChats,
      resolvedChats,
      totalMessages,
      averageResponseTime,
      averageHandlingTime,
      sentMessagesPerHour,
      state: agent.agentState,
    };
  }

  /**
   * Obtener métricas por campaña
   */
  async getCampaignMetrics(campaignId: string, dateRange?: DateRange): Promise<CampaignMetrics> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.campaign', 'campaign')
      .where('chat.campaignId = :campaignId', { campaignId });

    if (dateRange) {
      query.andWhere('chat.createdAt BETWEEN :startDate AND :endDate', dateRange);
    }

    const totalChats = await query.getCount();
    const activeChats = await query.clone().andWhere('chat.status = :status', { status: ChatStatus.ACTIVE }).getCount();
    const waitingChats = await query.clone().andWhere('chat.status = :status', { status: ChatStatus.WAITING }).getCount();
    const resolvedChats = await query.clone().andWhere('chat.status = :status', { status: ChatStatus.RESOLVED }).getCount();

    // Métricas de clientes
    const clientQuery = this.clientRepository
      .createQueryBuilder('client')
      .where('client.campaignId = :campaignId', { campaignId });

    if (dateRange) {
      clientQuery.andWhere('client.createdAt BETWEEN :startDate AND :endDate', dateRange);
    }

    const totalClients = await clientQuery.getCount();
    const newLeads = await clientQuery.clone().andWhere('client.leadStatus = :status', { status: LeadStatus.NEW }).getCount();
    const qualifiedLeads = await clientQuery.clone().andWhere('client.leadStatus = :status', { status: LeadStatus.QUALIFIED }).getCount();
    const convertedLeads = await clientQuery.clone().andWhere('client.leadStatus = :status', { status: LeadStatus.WON }).getCount();

    // TMR y TMO
    const averageResponseTime = await this.calculateCampaignResponseTime(campaignId, dateRange);
    const averageHandlingTime = await this.calculateCampaignHandlingTime(campaignId, dateRange);

    // Obtener nombre de campaña
    const campaign = await query.select('campaign.name').getRawOne();

    return {
      campaignId,
      campaignName: campaign?.campaign_name || 'Sin nombre',
      totalChats,
      activeChats,
      waitingChats,
      resolvedChats,
      totalClients,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      averageResponseTime,
      averageHandlingTime,
    };
  }

  /**
   * Obtener métricas de todos los agentes
   */
  async getAllAgentsMetrics(dateRange?: DateRange): Promise<AgentMetrics[]> {
    const agents = await this.userRepository.find({ where: { isAgent: true } });

    const metrics = await Promise.all(
      agents.map((agent) => this.getAgentMetrics(agent.id, dateRange)),
    );

    return metrics.sort((a, b) => b.totalChats - a.totalChats);
  }

  /**
   * Obtener ranking de agentes por métrica
   */
  async getAgentRanking(
    metric: 'totalChats' | 'resolvedChats' | 'averageResponseTime' | 'sentMessagesPerHour',
    dateRange?: DateRange,
    limit: number = 10,
  ): Promise<AgentMetrics[]> {
    const allMetrics = await this.getAllAgentsMetrics(dateRange);

    const sorted = allMetrics.sort((a, b) => {
      if (metric === 'averageResponseTime') {
        return a[metric] - b[metric]; // Menor es mejor
      }
      return b[metric] - a[metric]; // Mayor es mejor
    });

    return sorted.slice(0, limit);
  }

  /**
   * Calcular TMR (Tiempo Medio de Respuesta) promedio
   */
  private async calculateAverageResponseTime(dateRange?: DateRange): Promise<number> {
    // Simplificado: calcular tiempo entre primer mensaje del cliente y primera respuesta del agente
    const chats = await this.chatRepository.find({
      where: dateRange
        ? { createdAt: Between(dateRange.startDate, dateRange.endDate) }
        : {},
      relations: ['messages'],
      take: 100,
    });

    const responseTimes: number[] = [];

    for (const chat of chats) {
      if (!chat.messages || chat.messages.length < 2) continue;

      const firstInbound = chat.messages.find((m) => m.direction === MessageDirection.INBOUND);
      const firstOutbound = chat.messages.find((m) => m.direction === MessageDirection.OUTBOUND);

      if (firstInbound && firstOutbound && firstOutbound.createdAt > firstInbound.createdAt) {
        const responseTime = (firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 0;

    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average);
  }

  /**
   * Calcular TMR por agente
   */
  private async calculateAgentResponseTime(agentId: string, dateRange?: DateRange): Promise<number> {
    const chats = await this.chatRepository.find({
      where: {
        assignedAgentId: agentId,
        ...(dateRange ? { createdAt: Between(dateRange.startDate, dateRange.endDate) } : {}),
      },
      relations: ['messages'],
      take: 100,
    });

    const responseTimes: number[] = [];

    for (const chat of chats) {
      if (!chat.messages || chat.messages.length < 2) continue;

      const firstInbound = chat.messages.find((m) => m.direction === MessageDirection.INBOUND);
      const firstOutbound = chat.messages.find((m) => m.direction === MessageDirection.OUTBOUND);

      if (firstInbound && firstOutbound && firstOutbound.createdAt > firstInbound.createdAt) {
        const responseTime = (firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 0;

    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  /**
   * Calcular TMR por campaña
   */
  private async calculateCampaignResponseTime(campaignId: string, dateRange?: DateRange): Promise<number> {
    const chats = await this.chatRepository.find({
      where: {
        campaignId,
        ...(dateRange ? { createdAt: Between(dateRange.startDate, dateRange.endDate) } : {}),
      },
      relations: ['messages'],
      take: 100,
    });

    const responseTimes: number[] = [];

    for (const chat of chats) {
      if (!chat.messages || chat.messages.length < 2) continue;

      const firstInbound = chat.messages.find((m) => m.direction === MessageDirection.INBOUND);
      const firstOutbound = chat.messages.find((m) => m.direction === MessageDirection.OUTBOUND);

      if (firstInbound && firstOutbound && firstOutbound.createdAt > firstInbound.createdAt) {
        const responseTime = (firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 0;

    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  /**
   * Calcular TMO (Tiempo Medio de Operación) por agente
   */
  private async calculateAgentHandlingTime(agentId: string, dateRange?: DateRange): Promise<number> {
    const chats = await this.chatRepository.find({
      where: {
        assignedAgentId: agentId,
        status: ChatStatus.RESOLVED,
        ...(dateRange ? { createdAt: Between(dateRange.startDate, dateRange.endDate) } : {}),
      },
      take: 100,
    });

    const handlingTimes: number[] = [];

    for (const chat of chats) {
      if (chat.resolvedAt && chat.createdAt) {
        const handlingTime = (chat.resolvedAt.getTime() - chat.createdAt.getTime()) / 1000;
        handlingTimes.push(handlingTime);
      }
    }

    if (handlingTimes.length === 0) return 0;

    return Math.round(handlingTimes.reduce((sum, time) => sum + time, 0) / handlingTimes.length);
  }

  /**
   * Calcular TMO por campaña
   */
  private async calculateCampaignHandlingTime(campaignId: string, dateRange?: DateRange): Promise<number> {
    const chats = await this.chatRepository.find({
      where: {
        campaignId,
        status: ChatStatus.RESOLVED,
        ...(dateRange ? { createdAt: Between(dateRange.startDate, dateRange.endDate) } : {}),
      },
      take: 100,
    });

    const handlingTimes: number[] = [];

    for (const chat of chats) {
      if (chat.resolvedAt && chat.createdAt) {
        const handlingTime = (chat.resolvedAt.getTime() - chat.createdAt.getTime()) / 1000;
        handlingTimes.push(handlingTime);
      }
    }

    if (handlingTimes.length === 0) return 0;

    return Math.round(handlingTimes.reduce((sum, time) => sum + time, 0) / handlingTimes.length);
  }

  /**
   * Obtener gráficos de tendencias (chats por día)
   */
  async getChatsTrend(dateRange: DateRange, campaignId?: string): Promise<any[]> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .select('DATE(chat.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('chat.createdAt BETWEEN :startDate AND :endDate', dateRange)
      .groupBy('DATE(chat.createdAt)')
      .orderBy('DATE(chat.createdAt)', 'ASC');

    if (campaignId) {
      query.andWhere('chat.campaignId = :campaignId', { campaignId });
    }

    return query.getRawMany();
  }

  /**
   * Obtener distribución de chats por estado
   */
  async getChatsDistribution(campaignId?: string): Promise<any> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('chat.status');

    if (campaignId) {
      query.where('chat.campaignId = :campaignId', { campaignId });
    }

    const results = await query.getRawMany();

    return results.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});
  }

  /**
   * Obtener conteo de tareas pendientes
   */
  async getPendingTasksCount(): Promise<number> {
    return this.taskRepository.count({
      where: [
        { status: TaskStatus.PENDING },
        { status: TaskStatus.IN_PROGRESS },
      ],
    });
  }

  /**
   * Obtener resumen de cobranza
   */
  async getCollectionSummary(): Promise<{ totalDebt: number; recoveredToday: number }> {
    // Total de deuda
    const debtResult = await this.clientRepository
      .createQueryBuilder('client')
      .select('SUM(client.debtAmount)', 'totalDebt')
      .where('client.debtAmount > 0')
      .getRawOne();

    // Recuperado hoy (promesas de pago para hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recoveredResult = await this.clientRepository
      .createQueryBuilder('client')
      .select('SUM(client.promisePaymentAmount)', 'recovered')
      .where('client.promisePaymentDate >= :today', { today })
      .andWhere('client.promisePaymentDate < :tomorrow', { tomorrow })
      .andWhere('client.collectionStatus = :status', { status: 'promise' })
      .getRawOne();

    return {
      totalDebt: parseFloat(debtResult?.totalDebt || '0'),
      recoveredToday: parseFloat(recoveredResult?.recovered || '0'),
    };
  }

  /**
   * Obtener rendimiento de agentes para dashboard
   */
  async getAgentsPerformance(): Promise<any[]> {
    const agents = await this.userRepository.find({
      where: { isAgent: true },
      select: ['id', 'fullName', 'email', 'agentState', 'maxConcurrentChats'],
    });

    const performance = await Promise.all(
      agents.map(async (agent) => {
        // Contar chats activos del agente
        const currentChats = await this.chatRepository.count({
          where: {
            assignedAgentId: agent.id,
            status: ChatStatus.ACTIVE,
          },
        });

        // Mensajes enviados hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesSent = await this.messageRepository
          .createQueryBuilder('message')
          .innerJoin('message.chat', 'chat')
          .where('chat.assignedAgentId = :agentId', { agentId: agent.id })
          .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
          .andWhere('message.createdAt >= :today', { today })
          .getCount();

        // Promesas obtenidas hoy
        const promisesObtained = await this.clientRepository
          .createQueryBuilder('client')
          .innerJoin('client.chats', 'chat')
          .where('chat.assignedAgentId = :agentId', { agentId: agent.id })
          .andWhere('client.collectionStatus = :status', { status: 'promise' })
          .andWhere('client.promisePaymentDate >= :today', { today })
          .getCount();

        // TMR del agente
        const averageResponseTime = await this.calculateAgentResponseTime(agent.id);

        return {
          id: agent.id,
          name: agent.fullName,
          email: agent.email,
          currentChats,
          maxChats: agent.maxConcurrentChats || 5,
          messagesSent,
          promisesObtained,
          averageResponseTime,
          status: agent.agentState,
        };
      }),
    );

    return performance;
  }

  /**
   * Obtener estadísticas del agente individual
   */
  async getAgentStats(agentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Chats activos
    const activeChats = await this.chatRepository.count({
      where: { assignedAgentId: agentId, status: ChatStatus.ACTIVE },
    });

    // Chats totales del día
    const totalChatsToday = await this.chatRepository.count({
      where: {
        assignedAgentId: agentId,
        assignedAt: Between(today, new Date()),
      },
    });

    // Mensajes enviados hoy
    const messagesCount = await this.messageRepository.count({
      where: {
        senderId: agentId,
        direction: MessageDirection.OUTBOUND,
        createdAt: Between(today, new Date()),
      },
    });

    // Promesas obtenidas hoy
    const promisesObtained = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoin('client.chats', 'chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('client.collectionStatus = :status', { status: 'promise' })
      .andWhere('client.promisePaymentDate >= :today', { today })
      .getCount();

    // Dinero recuperado hoy (simulado - se debe implementar con tabla de pagos)
    const recoveredAmount = promisesObtained * 500000; // Simulación

    // Tiempo promedio de respuesta
    const averageResponseTime = await this.calculateAgentResponseTime(agentId);

    // Tasa de completación (chats resueltos vs totales)
    const resolvedChatsToday = await this.chatRepository.count({
      where: {
        assignedAgentId: agentId,
        status: ChatStatus.RESOLVED,
        resolvedAt: Between(today, new Date()),
      },
    });
    const completionRate = totalChatsToday > 0 
      ? Math.round((resolvedChatsToday / totalChatsToday) * 100) 
      : 0;

    // Obtener max chats del agente
    const agent = await this.userRepository.findOne({ where: { id: agentId } });

    return {
      activeChats,
      totalChatsToday,
      maxConcurrentChats: agent?.maxConcurrentChats || 5,
      messagesCount,
      promisesObtained,
      recoveredAmount,
      averageResponseTime,
      completionRate,
    };
  }

  /**
   * Obtener actividad reciente del agente
   */
  async getAgentActivity(agentId: string) {
    const activities = [];

    // Últimos 10 mensajes enviados
    const recentMessages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('message.senderId = :agentId', { agentId })
      .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .orderBy('message.createdAt', 'DESC')
      .take(5)
      .getMany();

    for (const msg of recentMessages) {
      activities.push({
        id: msg.id,
        type: 'message',
        description: `Mensaje enviado: ${msg.content.substring(0, 50)}...`,
        timestamp: msg.createdAt,
      });
    }

    // Últimas promesas obtenidas
    const recentPromises = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoin('client.chats', 'chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('client.collectionStatus = :status', { status: 'promise' })
      .orderBy('client.updatedAt', 'DESC')
      .take(5)
      .getMany();

    for (const client of recentPromises) {
      activities.push({
        id: client.id,
        type: 'promise',
        description: `Promesa de pago: ${client.fullName}`,
        timestamp: client.updatedAt,
        amount: client.promisePaymentAmount || 0,
      });
    }

    // Chats cerrados recientemente
    const closedChats = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.client', 'client')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.status = :status', { status: ChatStatus.CLOSED })
      .orderBy('chat.closedAt', 'DESC')
      .take(5)
      .getMany();

    for (const chat of closedChats) {
      activities.push({
        id: chat.id,
        type: 'chat_closed',
        description: `Chat cerrado: ${chat.contactName}`,
        timestamp: chat.closedAt,
      });
    }

    // Ordenar por fecha y retornar los 10 más recientes
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }
}
