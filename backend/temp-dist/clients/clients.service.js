"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClientsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
const paz_y_salvo_service_1 = require("./paz-y-salvo.service");
let ClientsService = ClientsService_1 = class ClientsService {
    constructor(clientRepository, eventEmitter, pazYSalvoService) {
        this.clientRepository = clientRepository;
        this.eventEmitter = eventEmitter;
        this.pazYSalvoService = pazYSalvoService;
        this.logger = new common_1.Logger(ClientsService_1.name);
    }
    /**
     * Crear nuevo cliente
     */
    async create(createClientDto, createdBy) {
        this.logger.log(`Creando cliente: ${createClientDto.phone}`);
        // Construir fullName a partir de firstName y lastName
        const fullName = [createClientDto.firstName, createClientDto.lastName]
            .filter(Boolean)
            .join(' ') || 'Sin nombre';
        const client = this.clientRepository.create({
            ...createClientDto,
            fullName,
        });
        if (createdBy) {
            client.createdBy = createdBy;
        }
        const saved = await this.clientRepository.save(client);
        const savedClient = Array.isArray(saved) ? saved[0] : saved;
        this.eventEmitter.emit('client.created', savedClient);
        return savedClient;
    }
    /**
     * Obtener todos los clientes con filtros
     */
    async findAll(filters) {
        const query = this.clientRepository.createQueryBuilder('client');
        // Filtro de búsqueda
        if (filters?.search) {
            query.andWhere('(client.firstName LIKE :search OR client.lastName LIKE :search OR client.phone LIKE :search OR client.email LIKE :search OR client.company LIKE :search)', { search: `%${filters.search}%` });
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
    async findOne(id) {
        const client = await this.clientRepository.findOne({
            where: { id },
            relations: ['campaign', 'chats', 'tasks'],
        });
        if (!client) {
            throw new common_1.NotFoundException(`Cliente ${id} no encontrado`);
        }
        return client;
    }
    /**
     * Obtener cliente por teléfono
     */
    async findByPhone(phone) {
        return this.clientRepository.findOne({ where: { phone } });
    }
    /**
     * Obtener cliente por email
     */
    async findByEmail(email) {
        return this.clientRepository.findOne({ where: { email } });
    }
    /**
     * Actualizar cliente
     */
    async update(id, updateClientDto) {
        const client = await this.clientRepository.findOne({ where: { id } });
        if (!client) {
            throw new common_1.NotFoundException(`Cliente ${id} no encontrado`);
        }
        // Si se actualiza firstName o lastName, reconstruir fullName
        if (updateClientDto.firstName || updateClientDto.lastName) {
            const firstName = updateClientDto.firstName || client.fullName?.split(' ')[0] || '';
            const lastName = updateClientDto.lastName || client.fullName?.split(' ').slice(1).join(' ') || '';
            updateClientDto.fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Sin nombre';
        }
        // Si se cambia el estado a "paid", registrar fecha y monto de pago y crear paz y salvo
        if (updateClientDto.collectionStatus === 'paid' && client.collectionStatus !== 'paid') {
            if (!updateClientDto.lastPaymentDate) {
                updateClientDto.lastPaymentDate = new Date();
            }
            if (!updateClientDto.lastPaymentAmount && client.debtAmount) {
                updateClientDto.lastPaymentAmount = client.debtAmount;
            }
            // Crear paz y salvo automáticamente
            try {
                await this.pazYSalvoService.createPazYSalvo(client.id, updateClientDto.lastPaymentDate, updateClientDto.lastPaymentAmount || client.debtAmount, {
                    originalDebtAmount: client.debtAmount,
                });
                this.logger.log(`📜 Paz y Salvo creado automáticamente para ${client.fullName}`);
            }
            catch (error) {
                this.logger.error(`Error creando paz y salvo: ${error.message}`);
            }
        }
        // Si se cambia el estado a "promise", registrar fecha y monto de promesa
        if (updateClientDto.collectionStatus === 'promise' && client.collectionStatus !== 'promise') {
            if (!updateClientDto.promisePaymentDate) {
                // Por defecto, 15 días desde hoy
                const promiseDate = new Date();
                promiseDate.setDate(promiseDate.getDate() + 15);
                updateClientDto.promisePaymentDate = promiseDate;
            }
            if (!updateClientDto.promisePaymentAmount && client.debtAmount) {
                updateClientDto.promisePaymentAmount = client.debtAmount;
            }
        }
        Object.assign(client, updateClientDto);
        const updatedClient = await this.clientRepository.save(client);
        this.eventEmitter.emit('client.updated', updatedClient);
        return updatedClient;
    }
    /**
     * Cambiar estado del lead
     */
    async updateLeadStatus(id, leadStatus) {
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
    async addNote(id, note, addedBy) {
        const client = await this.findOne(id);
        const newNote = {
            id: Date.now().toString(),
            content: note,
            addedBy,
            addedAt: new Date(),
        };
        client.notes = [...(client.notes || []), newNote];
        return this.clientRepository.save(client);
    }
    /**
     * Agregar tags
     */
    async addTags(id, tags) {
        const client = await this.findOne(id);
        const existingTags = client.tags || [];
        const newTags = tags.filter((tag) => !existingTags.includes(tag));
        client.tags = [...existingTags, ...newTags];
        return this.clientRepository.save(client);
    }
    /**
     * Remover tags
     */
    async removeTags(id, tags) {
        const client = await this.findOne(id);
        client.tags = (client.tags || []).filter((tag) => !tags.includes(tag));
        return this.clientRepository.save(client);
    }
    /**
     * Asignar cliente a usuario
     */
    async assignTo(id, userId) {
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
    async remove(id) {
        const client = await this.findOne(id);
        await this.clientRepository.softRemove(client);
        this.eventEmitter.emit('client.deleted', { clientId: id });
        this.logger.log(`Cliente ${id} eliminado`);
    }
    /**
     * Obtener estadísticas de clientes
     */
    async getStats(campaignId) {
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
    async findDuplicates() {
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
    async bulkImport(clients, createdBy) {
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
                }
                else {
                    // Crear nuevo
                    await this.create(clientDto, createdBy);
                }
                success++;
            }
            catch (error) {
                this.logger.error(`Error importando cliente ${clientDto.phone}: ${error.message}`);
                failed++;
            }
        }
        return { success, failed };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = ClientsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => paz_y_salvo_service_1.PazYSalvoService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_emitter_1.EventEmitter2,
        paz_y_salvo_service_1.PazYSalvoService])
], ClientsService);
