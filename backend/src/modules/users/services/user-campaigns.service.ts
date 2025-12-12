import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserCampaign } from '../entities/user-campaign.entity';

@Injectable()
export class UserCampaignsService {
  private readonly logger = new Logger(UserCampaignsService.name);

  constructor(
    @InjectRepository(UserCampaign)
    private readonly userCampaignRepository: Repository<UserCampaign>,
  ) {}

  /**
   * Asignar un usuario a una o varias campañas
   */
  async assignUserToCampaigns(
    userId: string,
    campaignIds: string[],
    primaryCampaignId?: string,
  ): Promise<UserCampaign[]> {
    // Desactivar asignaciones anteriores
    await this.userCampaignRepository.update(
      { userId, isActive: true },
      { isActive: false, isPrimary: false },
    );

    const assignments: UserCampaign[] = [];

    for (const campaignId of campaignIds) {
      // Verificar si ya existe la asignación
      let existing = await this.userCampaignRepository.findOne({
        where: { userId, campaignId },
      });

      if (existing) {
        // Reactivar
        existing.isActive = true;
        existing.isPrimary = campaignId === primaryCampaignId;
        existing = await this.userCampaignRepository.save(existing);
        assignments.push(existing);
      } else {
        // Crear nueva
        const newAssignment = this.userCampaignRepository.create({
          userId,
          campaignId,
          isActive: true,
          isPrimary: campaignId === primaryCampaignId,
        });
        assignments.push(await this.userCampaignRepository.save(newAssignment));
      }
    }

    // Si no se especificó primary, hacer la primera como primary
    if (!primaryCampaignId && assignments.length > 0) {
      assignments[0].isPrimary = true;
      await this.userCampaignRepository.save(assignments[0]);
    }

    this.logger.log(`Usuario ${userId} asignado a ${campaignIds.length} campañas`);
    return assignments;
  }

  /**
   * Obtener campañas activas de un usuario
   */
  async getUserCampaigns(userId: string): Promise<UserCampaign[]> {
    return this.userCampaignRepository.find({
      where: { userId, isActive: true },
      relations: ['campaign'],
      order: { isPrimary: 'DESC', assignedAt: 'ASC' },
    });
  }

  /**
   * Obtener IDs de campañas activas de un usuario
   */
  async getUserCampaignIds(userId: string): Promise<string[]> {
    const assignments = await this.userCampaignRepository.find({
      where: { userId, isActive: true },
      select: ['campaignId'],
    });
    return assignments.map((a) => a.campaignId);
  }

  /**
   * Obtener agentes de una campaña específica
   */
  async getCampaignAgents(campaignId: string): Promise<UserCampaign[]> {
    return this.userCampaignRepository.find({
      where: { campaignId, isActive: true },
      relations: ['user'],
    });
  }

  /**
   * Obtener IDs de agentes de una campaña
   */
  async getCampaignAgentIds(campaignId: string): Promise<string[]> {
    const assignments = await this.userCampaignRepository.find({
      where: { campaignId, isActive: true },
      select: ['userId'],
    });
    return assignments.map((a) => a.userId);
  }

  /**
   * Verificar si un usuario está asignado a una campaña
   */
  async isUserInCampaign(userId: string, campaignId: string): Promise<boolean> {
    const count = await this.userCampaignRepository.count({
      where: { userId, campaignId, isActive: true },
    });
    return count > 0;
  }

  /**
   * Obtener la campaña principal de un usuario
   */
  async getPrimaryCampaign(userId: string): Promise<UserCampaign | null> {
    return this.userCampaignRepository.findOne({
      where: { userId, isPrimary: true, isActive: true },
      relations: ['campaign'],
    });
  }

  /**
   * Remover usuario de una campaña
   */
  async removeUserFromCampaign(userId: string, campaignId: string): Promise<void> {
    await this.userCampaignRepository.update(
      { userId, campaignId },
      { isActive: false },
    );
    this.logger.log(`Usuario ${userId} removido de campaña ${campaignId}`);
  }

  /**
   * Remover usuario de todas las campañas
   */
  async removeUserFromAllCampaigns(userId: string): Promise<void> {
    await this.userCampaignRepository.update(
      { userId },
      { isActive: false },
    );
    this.logger.log(`Usuario ${userId} removido de todas las campañas`);
  }
}
