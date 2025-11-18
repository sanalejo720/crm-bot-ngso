import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Client, LeadStatus } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nuevo cliente
   */
  async create(createClientDto: CreateClientDto, createdBy?: string): Promise<Client> {
    this.logger.log(`Creando cliente: ${createClientDto.phone}`);

    // Construir fullName a partir de firstName y lastName
    const fullName = [createClientDto.firstName, createClientDto.lastName]
      .filter(Boolean)
      .join(' ') || 'Sin nombre';

    const client = this.clientRepository.create({
      ...createClientDto,
      fullName,
    } as any);
    
    if (createdBy) {
      (client as any).createdBy = createdBy;
    }

    const saved = await this.clientRepository.save(client);
    const savedClient = Array.isArray(saved) ? saved[0] : saved;

    this.eventEmitter.emit('client.created', savedClient);

    return savedClient;
  }

  /**
   * Obtener todos los clientes con filtros
   */
  async findAll(filters?: {
    search?: string;
    leadStatus?: LeadStatus;
    campaignId?: string;
    tags?: string[];
    assignedTo?: string;
  }): Promise<Client[]> {
    const query = this.clientRepository.createQueryBuilder('client');

    // Filtro de búsqueda
    if (filters?.search) {
      query.andWhere(
        '(client.firstName LIKE :search OR client.lastName LIKE :search OR client.phone LIKE :search OR client.email LIKE :search OR client.company LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Filtro por estado de lead
    if (filters?.leadStatus) {
      query.andWhere('client.leadStatus = :leadStatus', { leadStatus: filters.leadStatus });
    }

    // Filtro por campaña
    if (filters?.campaignId) {
      query.andWhere('client.campaignId = :campaignId', { campaignId: filters.campaignId });
    }

    // Filtro por tags
    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('client.tags && :tags', { tags: filters.tags });
    }

    // Filtro por asignado a
    if (filters?.assignedTo) {
      query.andWhere('client.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    query.orderBy('client.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener cliente por ID
   */
  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['campaign', 'chats', 'tasks'],
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return client;
  }

  /**
   * Obtener cliente por teléfono
   */
  async findByPhone(phone: string): Promise<Client | null> {
    return this.clientRepository.findOne({ where: { phone } });
  }

  /**
   * Obtener cliente por email
   */
  async findByEmail(email: string): Promise<Client | null> {
    return this.clientRepository.findOne({ where: { email } });
  }

  /**
   * Actualizar cliente
   */
  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    Object.assign(client, updateClientDto);

    const updatedClient = await this.clientRepository.save(client);

    this.eventEmitter.emit('client.updated', updatedClient);

    return updatedClient;
  }

  /**
   * Cambiar estado del lead
   */
  async updateLeadStatus(id: string, leadStatus: LeadStatus): Promise<Client> {
    const client = await this.findOne(id);

    const oldStatus = client.leadStatus;
    client.leadStatus = leadStatus;

    const updatedClient = await this.clientRepository.save(client);

    this.eventEmitter.emit('client.lead-status-changed', {
      client: updatedClient,
      oldStatus,
      newStatus: leadStatus,
    });

    return updatedClient;
  }

  /**
   * Agregar nota interna
   */
  async addNote(id: string, note: string, addedBy: string): Promise<Client> {
    const client = await this.findOne(id);

    const newNote = {
      id: Date.now().toString(),
      content: note,
      addedBy,
      addedAt: new Date(),
    };

    client.notes = [...(client.notes || []), newNote] as any;

    return this.clientRepository.save(client);
  }

  /**
   * Agregar tags
   */
  async addTags(id: string, tags: string[]): Promise<Client> {
    const client = await this.findOne(id);

    const existingTags = client.tags || [];
    const newTags = tags.filter((tag) => !existingTags.includes(tag));

    client.tags = [...existingTags, ...newTags];

    return this.clientRepository.save(client);
  }

  /**
   * Remover tags
   */
  async removeTags(id: string, tags: string[]): Promise<Client> {
    const client = await this.findOne(id);

    client.tags = (client.tags || []).filter((tag) => !tags.includes(tag));

    return this.clientRepository.save(client);
  }

  /**
   * Asignar cliente a usuario
   */
  async assignTo(id: string, userId: string): Promise<Client> {
    const client = await this.findOne(id);

    const oldAssignee = client.assignedTo;
    client.assignedTo = userId;

    const updatedClient = await this.clientRepository.save(client);

    this.eventEmitter.emit('client.assigned', {
      client: updatedClient,
      oldAssignee,
      newAssignee: userId,
    });

    return updatedClient;
  }

  /**
   * Eliminar cliente (soft delete)
   */
  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientRepository.softRemove(client);

    this.eventEmitter.emit('client.deleted', { clientId: id });

    this.logger.log(`Cliente ${id} eliminado`);
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getStats(campaignId?: string) {
    const query = this.clientRepository.createQueryBuilder('client');

    if (campaignId) {
      query.where('client.campaignId = :campaignId', { campaignId });
    }

    const total = await query.getCount();

    const byStatus = await query
      .select('client.leadStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('client.leadStatus')
      .getRawMany();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Buscar clientes duplicados por teléfono
   */
  async findDuplicates(): Promise<any[]> {
    const duplicates = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.phone', 'phone')
      .addSelect('COUNT(*)', 'count')
      .groupBy('client.phone')
      .having('COUNT(*) > 1')
      .getRawMany();

    return duplicates;
  }

  /**
   * Importar clientes en lote
   */
  async bulkImport(clients: CreateClientDto[], createdBy: string): Promise<{ success: number; failed: number }> {
    this.logger.log(`Importando ${clients.length} clientes`);

    let success = 0;
    let failed = 0;

    for (const clientDto of clients) {
      try {
        // Verificar si ya existe por teléfono
        const existing = await this.findByPhone(clientDto.phone);

        if (existing) {
          // Actualizar existente
          await this.update(existing.id, clientDto);
        } else {
          // Crear nuevo
          await this.create(clientDto, createdBy);
        }

        success++;
      } catch (error) {
        this.logger.error(`Error importando cliente ${clientDto.phone}: ${error.message}`);
        failed++;
      }
    }

    return { success, failed };
  }
}
