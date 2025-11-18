import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, AgentState } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Usuario creado: ${savedUser.email}`);

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
  }): Promise<User[]> {
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

    return query.getMany();
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
   * Decrementar contador de chats
   */
  async decrementChatCount(id: string): Promise<void> {
    await this.userRepository.decrement({ id }, 'currentChatsCount', 1);
  }

  /**
   * Obtener agentes disponibles para asignación
   */
  async getAvailableAgents(campaignId: string): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.campaignId = :campaignId', { campaignId })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.agentState = :agentState', { agentState: AgentState.AVAILABLE })
      .andWhere('user.currentChatsCount < user.maxConcurrentChats')
      .orderBy('user.currentChatsCount', 'ASC')
      .getMany();
  }
}
