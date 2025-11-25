import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface CreateAuditLogDto {
  userId?: string;
  userName?: string;
  action: string;
  module: string;
  entityId?: string;
  entityType?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear log de auditoría
   */
  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(data as any);
    const saved = await this.auditLogRepository.save(auditLog);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /**
   * Obtener logs con filtros
   */
  async findAll(filters?: {
    userId?: string;
    module?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters?.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters?.module) {
      query.andWhere('audit.module = :module', { module: filters.module });
    }

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.entityType) {
      query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    query.orderBy('audit.createdAt', 'DESC');

    if (filters?.limit) {
      query.take(filters.limit);
    }

    return query.getMany();
  }

  /**
   * Obtener logs por entidad
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener logs por usuario
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate && endDate) {
      query.where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const total = await query.getCount();

    const byModule = await query
      .clone()
      .select('audit.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.module')
      .getRawMany();

    const byAction = await query
      .clone()
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const byUser = await query
      .clone()
      .select('audit.userId', 'userId')
      .addSelect('audit.userName', 'userName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.userId, audit.userName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      byModule: byModule.reduce((acc, item) => {
        acc[item.module] = parseInt(item.count);
        return acc;
      }, {}),
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = parseInt(item.count);
        return acc;
      }, {}),
      topUsers: byUser.map((item) => ({
        userId: item.userId,
        userName: item.userName,
        count: parseInt(item.count),
      })),
    };
  }

  // ==================== EVENT LISTENERS ====================

  @OnEvent('user.created')
  handleUserCreated(data: any) {
    this.log({
      userId: data.createdBy,
      action: 'create',
      module: 'users',
      entityId: data.id,
      entityType: 'User',
      newValues: { email: data.email, fullName: data.fullName },
    });
  }

  @OnEvent('user.updated')
  handleUserUpdated(data: any) {
    this.log({
      userId: data.updatedBy,
      action: 'update',
      module: 'users',
      entityId: data.id,
      entityType: 'User',
    });
  }

  @OnEvent('user.deleted')
  handleUserDeleted(data: any) {
    this.log({
      action: 'delete',
      module: 'users',
      entityId: data.userId,
      entityType: 'User',
    });
  }

  @OnEvent('chat.assigned')
  handleChatAssigned(data: any) {
    this.log({
      userId: data.agentId,
      userName: data.agentName,
      action: 'assign',
      module: 'chats',
      entityId: data.chat.id,
      entityType: 'Chat',
      metadata: { agentId: data.agentId, agentName: data.agentName },
    });
  }

  @OnEvent('chat.transferred')
  handleChatTransferred(data: any) {
    this.log({
      userId: data.toAgentId,
      action: 'transfer',
      module: 'chats',
      entityId: data.chat.id,
      entityType: 'Chat',
      metadata: {
        fromAgentId: data.fromAgentId,
        toAgentId: data.toAgentId,
        fromAgentName: data.fromAgentName,
        toAgentName: data.toAgentName,
      },
    });
  }

  @OnEvent('campaign.created')
  handleCampaignCreated(data: any) {
    this.log({
      userId: data.createdBy,
      action: 'create',
      module: 'campaigns',
      entityId: data.id,
      entityType: 'Campaign',
      newValues: { name: data.name },
    });
  }

  @OnEvent('campaign.status-changed')
  handleCampaignStatusChanged(data: any) {
    this.log({
      action: 'update_status',
      module: 'campaigns',
      entityId: data.campaign.id,
      entityType: 'Campaign',
      oldValues: { status: data.oldStatus },
      newValues: { status: data.newStatus },
    });
  }

  @OnEvent('role.created')
  handleRoleCreated(data: any) {
    this.log({
      action: 'create',
      module: 'roles',
      entityId: data.id,
      entityType: 'Role',
      newValues: { name: data.name },
    });
  }

  @OnEvent('client.lead-status-changed')
  handleClientLeadStatusChanged(data: any) {
    this.log({
      action: 'update_lead_status',
      module: 'clients',
      entityId: data.client.id,
      entityType: 'Client',
      oldValues: { leadStatus: data.oldStatus },
      newValues: { leadStatus: data.newStatus },
    });
  }

  @OnEvent('task.status-changed')
  handleTaskStatusChanged(data: any) {
    this.log({
      action: 'update_status',
      module: 'tasks',
      entityId: data.task.id,
      entityType: 'Task',
      oldValues: { status: data.oldStatus },
      newValues: { status: data.newStatus },
    });
  }

  @OnEvent('message.created')
  handleMessageCreated(event: { message: any; chat: any }) {
    const { message } = event;
    this.log({
      action: 'create',
      module: 'messages',
      entityId: message.id,
      entityType: 'Message',
      metadata: {
        chatId: message.chatId,
        type: message.type,
        direction: message.direction,
      },
    });
  }
}
