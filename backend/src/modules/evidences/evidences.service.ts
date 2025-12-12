import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Evidence, EvidenceType } from './entities/evidence.entity';
import * as crypto from 'crypto';

@Injectable()
export class EvidencesService {
  private readonly logger = new Logger(EvidencesService.name);

  constructor(
    @InjectRepository(Evidence)
    private evidenceRepository: Repository<Evidence>,
  ) {}

  /**
   * Crear registro de evidencia
   */
  async create(data: {
    ticketNumber: string;
    closureType: 'paid' | 'promise' | 'transfer';
    filePath: string;
    fileName: string;
    chatId: string;
    clientId?: string;
    clientName: string;
    agentId: string;
    agentName: string;
    amount?: number;
    promiseDate?: Date;
  }): Promise<Evidence> {
    // Verificar si ya existe una evidencia con este ticketNumber
    const existing = await this.evidenceRepository.findOne({
      where: { ticketNumber: data.ticketNumber },
    });

    if (existing) {
      this.logger.warn(`⚠️ Ya existe evidencia para ticket ${data.ticketNumber}, actualizando...`);
      
      // Actualizar evidencia existente
      existing.closureType = data.closureType as EvidenceType;
      existing.filePath = data.filePath;
      existing.fileName = data.fileName;
      existing.amount = data.amount;
      existing.promiseDate = data.promiseDate;
      
      const updated = await this.evidenceRepository.save(existing);
      this.logger.log(`📋 Evidencia actualizada con QR: ${data.ticketNumber}`);
      return updated;
    }

    // Crear nueva evidencia
    const evidence = this.evidenceRepository.create({
      ticketNumber: data.ticketNumber,
      closureType: data.closureType as EvidenceType,
      filePath: data.filePath,
      fileName: data.fileName,
      chatId: data.chatId,
      clientId: data.clientId,
      clientName: data.clientName,
      agentId: data.agentId,
      agentName: data.agentName,
      amount: data.amount,
      promiseDate: data.promiseDate,
    });

    const saved = await this.evidenceRepository.save(evidence);
    this.logger.log(`📋 Evidencia creada con QR: ${data.ticketNumber}`);
    
    return saved;
  }

  /**
   * Listar todas las evidencias con filtros
   */
  async findAll(filters?: {
    closureType?: 'paid' | 'promise' | 'transfer';
    agentId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Evidence[]> {
    const query = this.evidenceRepository
      .createQueryBuilder('evidence')
      .leftJoinAndSelect('evidence.agent', 'agent')
      .leftJoinAndSelect('evidence.client', 'client')
      .orderBy('evidence.createdAt', 'DESC');

    if (filters?.closureType) {
      query.andWhere('evidence.closureType = :closureType', {
        closureType: filters.closureType,
      });
    }

    if (filters?.agentId) {
      query.andWhere('evidence.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('evidence.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Obtener evidencia por ticket
   */
  async findByTicket(ticketNumber: string): Promise<Evidence> {
    const evidence = await this.evidenceRepository.findOne({
      where: { ticketNumber },
      relations: ['agent', 'client'],
    });

    if (!evidence) {
      throw new NotFoundException(`Evidencia ${ticketNumber} no encontrada`);
    }

    return evidence;
  }

  /**
   * Estadísticas de evidencias por agente
   */
  async getAgentStats(agentId?: string): Promise<any[]> {
    const query = this.evidenceRepository
      .createQueryBuilder('evidence')
      .select('evidence.agentId', 'agentId')
      .addSelect('evidence.agentName', 'agentName')
      .addSelect('COUNT(*)', 'totalEvidences')
      .addSelect(
        "SUM(CASE WHEN evidence.closureType = 'paid' THEN 1 ELSE 0 END)",
        'totalPaid',
      )
      .addSelect(
        "SUM(CASE WHEN evidence.closureType = 'promise' THEN 1 ELSE 0 END)",
        'totalPromises',
      )
      .addSelect('SUM(evidence.amount)', 'totalAmount')
      .groupBy('evidence.agentId')
      .addGroupBy('evidence.agentName')
      .orderBy('totalAmount', 'DESC');

    if (agentId) {
      query.where('evidence.agentId = :agentId', { agentId });
    }

    return query.getRawMany();
  }
}
