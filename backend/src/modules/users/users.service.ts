import { Injectable, NotFoundException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, AgentState } from './entities/user.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WorkdayService } from '../workday/workday.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserCampaign)
    private userCampaignRepository: Repository<UserCampaign>,
    @Inject(forwardRef(() => WorkdayService))
    private workdayService: WorkdayService,
  ) {}

  /**
   * Crear nuevo usuario
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Extraer campaignIds del DTO antes de crear el usuario
    const { campaignIds, ...userDataWithoutCampaigns } = createUserDto;

    const user = this.userRepository.create({
      ...userDataWithoutCampaigns,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Usuario creado: ${savedUser.email}`);

    // Si hay campaignIds, asignar las campañas al usuario
    if (campaignIds && campaignIds.length > 0) {
      for (const campaignId of campaignIds) {
        const userCampaign = this.userCampaignRepository.create({
          userId: savedUser.id,
          campaignId: campaignId,
          isActive: true,
          isPrimary: campaignId === campaignIds[0], // Primera es la principal
        });
        await this.userCampaignRepository.save(userCampaign);
      }
      this.logger.log(`Usuario ${savedUser.email} asignado a ${campaignIds.length} campaña(s)`);
    }

    return savedUser;
  }

  /**
   * Obtener todos los usuarios
   */
  async findAll(filters?: {
    status?: UserStatus;
    roleId?: string;
    campaignId?: string;
    isAgent?: boolean;
  }): Promise<any[]> {
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('user.campaign', 'campaign');

    if (filters?.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters?.roleId) {
      query.andWhere('user.roleId = :roleId', { roleId: filters.roleId });
    }

    if (filters?.campaignId) {
      query.andWhere('user.campaignId = :campaignId', { campaignId: filters.campaignId });
    }

    if (filters?.isAgent) {
      query.andWhere('role.name = :roleName', { roleName: 'Agente' });
    }

    const users = await query.getMany();

    // Obtener conteo de campañas para cada usuario agente
    const usersWithCampaigns = await Promise.all(
      users.map(async (user) => {
        if (user.isAgent || user.role?.name === 'Agente') {
          const userCampaigns = await this.userCampaignRepository.find({
            where: { userId: user.id, isActive: true },
            relations: ['campaign'],
          });
          return {
            ...user,
            campaignCount: userCampaigns.length,
            campaignNames: userCampaigns.map(uc => uc.campaign?.name).filter(Boolean),
          };
        }
        return user;
      })
    );

    return usersWithCampaigns;
  }

  /**
   * Obtener usuario por ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions', 'campaign'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  /**
   * Obtener usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Usuario actualizado: ${updatedUser.email}`);

    return updatedUser;
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    await this.userRepository.update(id, {
      status: UserStatus.INACTIVE,
    });

    this.logger.log(`Usuario desactivado: ${user.email}`);
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(id, {
      password: hashedPassword,
    });

    this.logger.log(`Contraseña actualizada para usuario ID: ${id}`);
  }

  /**
   * Actualizar estado del agente
   */
  async updateAgentState(id: string, state: AgentState): Promise<User> {
    await this.userRepository.update(id, {
      agentState: state,
      lastActivityAt: new Date(),
    });

    return this.findOne(id);
  }

  /**
   * Incrementar contador de chats
   */
  async incrementChatCount(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'currentChatsCount', 1);
  }

  /**
   * Decrementar contador de chats (nunca baja de 0)
   */
  async decrementChatCount(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (user && user.currentChatsCount > 0) {
      await this.userRepository.decrement({ id }, 'currentChatsCount', 1);
    } else if (user) {
      // Si está en 0 o negativo, forzar a 0
      user.currentChatsCount = 0;
      await this.userRepository.save(user);
    }
  }

  /**
   * Obtener agentes disponibles para asignación
   * Solo incluye agentes que:
   * 1. Estén en la campaña (via user_campaigns o campaignId legacy)
   * 2. Estén activos
   * 3. Estén disponibles (no en pausa, no ocupados)
   * 4. Tengan capacidad para más chats
   * 5. Tengan jornada laboral activa (trabajando)
   */
  async getAvailableAgents(campaignId: string): Promise<User[]> {
    // Primero, obtener IDs de agentes asignados a esta campaña via user_campaigns
    const campaignAssignments = await this.userCampaignRepository.find({
      where: { campaignId, isActive: true },
      select: ['userId'],
    });
    const assignedUserIds = campaignAssignments.map(a => a.userId);

    // Construir query para agentes
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.agentState = :agentState', { agentState: AgentState.AVAILABLE })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats');

    // Filtrar por campaña: usar user_campaigns si hay asignaciones, sino usar campaignId legacy
    if (assignedUserIds.length > 0) {
      queryBuilder.andWhere('user.id IN (:...userIds)', { userIds: assignedUserIds });
    } else {
      // Fallback a campaignId en tabla users (legacy)
      queryBuilder.andWhere('user.campaignId = :campaignId', { campaignId });
    }

    const candidateAgents = await queryBuilder
      .orderBy('user.currentChatsCount', 'ASC')
      .getMany();

    // Filtrar agentes que tengan jornada laboral activa
    const availableAgents = [];
    for (const agent of candidateAgents) {
      try {
        const workday = await this.workdayService.getCurrentWorkday(agent.id);
        // Solo incluir si está trabajando (no en pausa ni desconectado)
        if (workday && workday.currentStatus === 'working' && !workday.clockOutTime) {
          availableAgents.push(agent);
        } else {
          this.logger.debug(`Agente ${agent.fullName} excluido: ${workday?.currentStatus || 'sin jornada'}`);
        }
      } catch (error) {
        // Si no tiene jornada activa, no está disponible
        this.logger.debug(`Agente ${agent.fullName} sin jornada laboral activa`);
      }
    }

    this.logger.log(`Agentes disponibles para campaña ${campaignId}: ${availableAgents.length} de ${candidateAgents.length} candidatos`);
    return availableAgents;
  }
}
