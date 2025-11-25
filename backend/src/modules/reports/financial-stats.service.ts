// Financial Stats Service - NGS&O CRM Gestión
// Servicio para estadísticas financieras y recaudo
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Client } from '../clients/entities/client.entity';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import {
  CampaignFinancialsDto,
  AgentRecaudoDto,
  FinancialSummaryDto,
  DailyFinancialsDto,
  FinancialTrendDto,
} from './dto/financial-stats.dto';

@Injectable()
export class FinancialStatsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getCampaignFinancials(
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CampaignFinancialsDto> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaña no encontrada');
    }

    // Total a recuperar (suma de deudas de clientes en la campaña)
    const totalToRecoverResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.debtAmount)', 'total')
      .innerJoin('client.chats', 'chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('chat.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalToRecover = parseFloat(totalToRecoverResult?.total || '0');

    // Total recuperado (suma de pagos con status CUMPLIDA)
    const totalRecoveredResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.lastPaymentAmount)', 'total')
      .addSelect('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('client.lastPaymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalRecovered = parseFloat(totalRecoveredResult?.total || '0');
    const clientsPaid = parseInt(totalRecoveredResult?.count || '0', 10);

    // Total en promesas (promisePaymentAmount cuando hay fecha de promesa)
    const totalInPromisesResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.promisePaymentAmount)', 'total')
      .addSelect('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('client.promisePaymentDate IS NOT NULL')
      .andWhere('client.promisePaymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalInPromises = parseFloat(totalInPromisesResult?.total || '0');
    const promisesCount = parseInt(totalInPromisesResult?.count || '0', 10);

    // Clientes con deuda
    const clientsWithDebtResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('client.debtAmount > 0')
      .getRawOne();

    const clientsWithDebt = parseInt(clientsWithDebtResult?.count || '0', 10);

    // Contar pagos
    const paymentsCountResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.campaignId = :campaignId', { campaignId })
      .andWhere('client.lastPaymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const paymentsCount = parseInt(paymentsCountResult?.count || '0', 10);

    const recoveryPercentage =
      totalToRecover > 0 ? (totalRecovered / totalToRecover) * 100 : 0;

    return {
      campaignId,
      campaignName: campaign.name,
      totalToRecover,
      totalRecovered,
      totalInPromises,
      recoveryPercentage,
      paymentsCount,
      promisesCount,
      clientsWithDebt,
      clientsPaid,
    };
  }

  async getAgentRecaudo(
    agentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AgentRecaudoDto> {
    const agent = await this.userRepo.findOne({
      where: { id: agentId },
      relations: ['role'],
    });

    if (!agent) {
      throw new Error('Agente no encontrado');
    }

    // Total recuperado por el agente
    const totalRecoveredResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.lastPaymentAmount)', 'total')
      .addSelect('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('client.lastPaymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalRecovered = parseFloat(totalRecoveredResult?.total || '0');
    const paymentsCount = parseInt(totalRecoveredResult?.count || '0', 10);

    // Promesas del agente
    const promisesResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.promisePaymentAmount)', 'total')
      .addSelect('COUNT(DISTINCT client.id)', 'count')
      .innerJoin('client.chats', 'chat')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('client.promisePaymentDate IS NOT NULL')
      .andWhere('client.promisePaymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalInPromises = parseFloat(promisesResult?.total || '0');
    const promisesCount = parseInt(promisesResult?.count || '0', 10);

    // Clientes atendidos
    const clientsAttendedResult = await this.chatRepo
      .createQueryBuilder('chat')
      .select('COUNT(DISTINCT chat.clientId)', 'count')
      .where('chat.assignedAgentId = :agentId', { agentId })
      .andWhere('chat.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const clientsAttended = parseInt(clientsAttendedResult?.count || '0', 10);

    // Tasa de efectividad (pagos / promesas)
    const effectivenessRate =
      promisesCount > 0 ? (paymentsCount / promisesCount) * 100 : 0;

    // Ticket promedio
    const averageTicket = paymentsCount > 0 ? totalRecovered / paymentsCount : 0;

    return {
      agentId,
      agentName: agent.fullName || 'Sin nombre',
      totalRecovered,
      paymentsCount,
      promisesCount,
      totalInPromises,
      effectivenessRate,
      averageTicket,
      clientsAttended,
    };
  }

  async getFinancialSummary(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialSummaryDto> {
    // Calcular fechas según el período
    const { start, end } = this.calculateDateRange(period, startDate, endDate);

    // Obtener todas las campañas activas
    const campaigns = await this.campaignRepo.find();

    // Obtener estadísticas por campaña
    const campaignsStats = await Promise.all(
      campaigns.map((campaign) =>
        this.getCampaignFinancials(campaign.id, start, end),
      ),
    );

    // Calcular totales globales
    const totalToRecover = campaignsStats.reduce(
      (sum, c) => sum + c.totalToRecover,
      0,
    );
    const totalRecovered = campaignsStats.reduce(
      (sum, c) => sum + c.totalRecovered,
      0,
    );
    const totalInPromises = campaignsStats.reduce(
      (sum, c) => sum + c.totalInPromises,
      0,
    );
    const globalRecoveryRate =
      totalToRecover > 0 ? (totalRecovered / totalToRecover) * 100 : 0;

    // Obtener top agentes
    const agents = await this.userRepo.find({
      where: { isAgent: true },
      relations: ['role'],
    });

    let topAgents = await Promise.all(
      agents.map((agent) => this.getAgentRecaudo(agent.id, start, end)),
    );

    // Ordenar por total recuperado
    topAgents = topAgents.sort((a, b) => b.totalRecovered - a.totalRecovered);

    // Asignar ranking
    topAgents = topAgents.map((agent, index) => ({
      ...agent,
      ranking: index + 1,
    }));

    // Tomar solo top 10
    topAgents = topAgents.slice(0, 10);

    return {
      period: this.formatPeriod(period, start, end),
      totalToRecover,
      totalRecovered,
      totalInPromises,
      globalRecoveryRate,
      campaignsStats,
      topAgents,
    };
  }

  async getDailyFinancials(date: Date): Promise<DailyFinancialsDto> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const recoveredResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('SUM(client.amountRecovered)', 'total')
      .select('COUNT(DISTINCT client.id)', 'count')
      .where('client.lastPaymentDate BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    const promisesResult = await this.clientRepo
      .createQueryBuilder('client')
      .select('COUNT(DISTINCT client.id)', 'count')
      .where('client.promiseDate BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    return {
      date: date.toISOString().split('T')[0],
      totalRecovered: parseFloat(recoveredResult?.total || '0'),
      paymentsCount: parseInt(recoveredResult?.count || '0', 10),
      promisesCount: parseInt(promisesResult?.count || '0', 10),
    };
  }

  async getFinancialTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialTrendDto> {
    const dates: string[] = [];
    const recovered: number[] = [];
    const promises: number[] = [];

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayData = await this.getDailyFinancials(new Date(currentDate));
      dates.push(dayData.date);
      recovered.push(dayData.totalRecovered);
      promises.push(dayData.promisesCount);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { dates, recovered, promises };
  }

  private calculateDateRange(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    startDate?: Date,
    endDate?: Date,
  ): { start: Date; end: Date } {
    const now = new Date();

    switch (period) {
      case 'daily':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: endOfDay };

      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);
        return { start: startOfWeek, end: now };

      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: now };

      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Se requieren startDate y endDate para período custom');
        }
        return { start: startDate, end: endDate };

      default:
        return { start: now, end: now };
    }
  }

  private formatPeriod(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    start: Date,
    end: Date,
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    switch (period) {
      case 'daily':
        return `Hoy - ${start.toLocaleDateString('es-CO', options)}`;
      case 'weekly':
        return `Última semana (${start.toLocaleDateString('es-CO', options)} - ${end.toLocaleDateString('es-CO', options)})`;
      case 'monthly':
        return `Mes actual - ${start.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}`;
      case 'custom':
        return `${start.toLocaleDateString('es-CO', options)} - ${end.toLocaleDateString('es-CO', options)}`;
      default:
        return 'Período desconocido';
    }
  }
}
