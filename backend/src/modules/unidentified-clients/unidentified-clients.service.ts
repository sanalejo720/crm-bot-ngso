import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidentifiedClient } from './entities/unidentified-client.entity';
import {
  CreateUnidentifiedClientDto,
  UpdateUnidentifiedClientDto,
  UpdateStatusDto,
} from './dto/unidentified-client.dto';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UnidentifiedClientsService {
  constructor(
    @InjectRepository(UnidentifiedClient)
    private readonly unidentifiedClientRepository: Repository<UnidentifiedClient>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateUnidentifiedClientDto): Promise<UnidentifiedClient> {
    const existing = await this.unidentifiedClientRepository.findOne({
      where: { phone: createDto.phone },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un registro para el teléfono ${createDto.phone}`);
    }

    if (createDto.chatId) {
      const chat = await this.chatRepository.findOne({ where: { id: createDto.chatId } });
      if (!chat) {
        throw new NotFoundException(`Chat con ID ${createDto.chatId} no encontrado`);
      }
    }

    if (createDto.assignedToId) {
      const user = await this.userRepository.findOne({ where: { id: createDto.assignedToId } });
      if (!user) {
        throw new NotFoundException(`Usuario con ID ${createDto.assignedToId} no encontrado`);
      }
    }

    const client = this.unidentifiedClientRepository.create(createDto);
    return await this.unidentifiedClientRepository.save(client);
  }

  async findAll(page: number = 1, limit: number = 10, status?: string, assignedTo?: string, search?: string) {
    const query = this.unidentifiedClientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.chat', 'chat')
      .leftJoinAndSelect('client.assignedTo', 'assignedTo');

    if (status) {
      query.andWhere('client.status = :status', { status });
    }

    if (assignedTo) {
      query.andWhere('client.assignedToId = :assignedTo', { assignedTo });
    }

    if (search) {
      query.andWhere('(client.phone LIKE :search OR client.name LIKE :search OR client.documentNumber LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('client.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<UnidentifiedClient> {
    const client = await this.unidentifiedClientRepository.findOne({
      where: { id },
      relations: ['chat', 'assignedTo'],
    });

    if (!client) {
      throw new NotFoundException(`Cliente no identificado con ID ${id} no encontrado`);
    }

    return client;
  }

  async findByPhone(phone: string): Promise<UnidentifiedClient | null> {
    return await this.unidentifiedClientRepository.findOne({
      where: { phone },
      relations: ['chat', 'assignedTo'],
    });
  }

  async update(id: string, updateDto: UpdateUnidentifiedClientDto): Promise<UnidentifiedClient> {
    const client = await this.findOne(id);

    if (updateDto.chatId) {
      const chat = await this.chatRepository.findOne({ where: { id: updateDto.chatId } });
      if (!chat) {
        throw new NotFoundException(`Chat con ID ${updateDto.chatId} no encontrado`);
      }
    }

    if (updateDto.assignedToId) {
      const user = await this.userRepository.findOne({ where: { id: updateDto.assignedToId } });
      if (!user) {
        throw new NotFoundException(`Usuario con ID ${updateDto.assignedToId} no encontrado`);
      }
    }

    Object.assign(client, updateDto);
    return await this.unidentifiedClientRepository.save(client);
  }

  async updateStatus(id: string, statusDto: UpdateStatusDto): Promise<UnidentifiedClient> {
    const client = await this.findOne(id);
    client.status = statusDto.status;
    
    if (statusDto.notes) {
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${statusDto.notes}`;
      client.notes = client.notes ? `${client.notes}\n${newNote}` : newNote;
    }

    return await this.unidentifiedClientRepository.save(client);
  }

  async assignTo(id: string, userId: string): Promise<UnidentifiedClient> {
    const client = await this.findOne(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    client.assignedToId = userId;
    return await this.unidentifiedClientRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.unidentifiedClientRepository.remove(client);
  }

  async getStats() {
    const stats = await this.unidentifiedClientRepository
      .createQueryBuilder('client')
      .select('client.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('client.status')
      .getRawMany();

    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});
  }
}
