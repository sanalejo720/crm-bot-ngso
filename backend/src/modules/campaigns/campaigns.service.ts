import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nueva campaña
   */
  async create(createCampaignDto: CreateCampaignDto, createdBy: string): Promise<Campaign> {
    this.logger.log(`Creando campaña: ${createCampaignDto.name}`);

    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      createdBy,
    } as any);

    const saved = await this.campaignRepository.save(campaign);
    const savedCampaign = Array.isArray(saved) ? saved[0] : saved;

    this.eventEmitter.emit('campaign.created', savedCampaign);

    return savedCampaign;
  }

  /**
   * Obtener todas las campañas con filtros
   */
  async findAll(filters?: {
    status?: CampaignStatus;
    search?: string;
  }): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(campaign.name LIKE :search OR campaign.description LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query
      .leftJoinAndSelect('campaign.whatsappNumbers', 'whatsappNumbers')
      .orderBy('campaign.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener campañas activas
   */
  async findActive(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      where: { status: CampaignStatus.ACTIVE },
      relations: ['whatsappNumbers'],
    });
  }

  /**
   * Obtener campaña por ID
   */
  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['whatsappNumbers', 'chats', 'debtors'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaña ${id} no encontrada`);
    }

    return campaign;
  }

  /**
   * Actualizar campaña
   */
  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);

    Object.assign(campaign, updateCampaignDto);

    const updatedCampaign = await this.campaignRepository.save(campaign);

    this.eventEmitter.emit('campaign.updated', updatedCampaign);

    return updatedCampaign;
  }

  /**
   * Cambiar estado de campaña
   */
  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = await this.findOne(id);

    const oldStatus = campaign.status;
    campaign.status = status;

    const updatedCampaign = await this.campaignRepository.save(campaign);

    this.eventEmitter.emit('campaign.status-changed', {
      campaign: updatedCampaign,
      oldStatus,
      newStatus: status,
    });

    return updatedCampaign;
  }

  /**
   * Actualizar configuración de la campaña
   */
  async updateSettings(
    id: string,
    settings: Record<string, any>,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

    campaign.settings = {
      ...campaign.settings,
      ...settings,
    };

    return this.campaignRepository.save(campaign);
  }

  /**
   * Activar campaña
   */
  async activate(id: string): Promise<Campaign> {
    return this.updateStatus(id, CampaignStatus.ACTIVE);
  }

  /**
   * Pausar campaña
   */
  async pause(id: string): Promise<Campaign> {
    return this.updateStatus(id, CampaignStatus.PAUSED);
  }

  /**
   * Eliminar campaña (soft delete)
   */
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignRepository.softRemove(campaign);

    this.eventEmitter.emit('campaign.deleted', { campaignId: id });

    this.logger.log(`Campaña ${id} eliminada`);
  }

  /**
   * Obtener estadísticas de campaña
   */
  async getStats(id: string) {
    const campaign = await this.findOne(id);

    // Total de chats
    const totalChats = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.chats', 'chat')
      .where('campaign.id = :id', { id })
      .getCount();

    // Chats por estado
    const chatsByStatus = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.chats', 'chat')
      .select('chat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('campaign.id = :id', { id })
      .groupBy('chat.status')
      .getRawMany();

    // Total de deudores
    const totalDebtors = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.debtors', 'debtor')
      .where('campaign.id = :id', { id })
      .getCount();

    // Deudores por estado
    const debtorsByStatus = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.debtors', 'debtor')
      .select('debtor.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('campaign.id = :id', { id })
      .groupBy('debtor.status')
      .getRawMany();

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalChats,
      chatsByStatus: chatsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      totalDebtors,
      debtorsByStatus: debtorsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Obtener números de WhatsApp de una campaña
   */
  async getWhatsappNumbers(id: string) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['whatsappNumbers'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaña ${id} no encontrada`);
    }

    return campaign.whatsappNumbers;
  }

  /**
   * Duplicar campaña
   */
  async duplicate(id: string, newName: string, createdBy: string): Promise<Campaign> {
    const original = await this.findOne(id);

    const duplicated = this.campaignRepository.create({
      name: newName,
      description: original.description ? `${original.description} (Copia)` : undefined,
      status: CampaignStatus.DRAFT,
      settings: { ...original.settings },
      createdBy,
    } as any);

    const saved = await this.campaignRepository.save(duplicated);
    const savedCampaign = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Campaña ${id} duplicada como ${savedCampaign.id}`);

    return savedCampaign;
  }
}
