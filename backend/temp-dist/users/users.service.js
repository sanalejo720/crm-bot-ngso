"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const workday_service_1 = require("../workday/workday.service");
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepository, workdayService) {
        this.userRepository = userRepository;
        this.workdayService = workdayService;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    /**
     * Crear nuevo usuario
     */
    async create(createUserDto) {
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado');
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
    async findAll(filters) {
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
    async findOne(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['role', 'role.permissions', 'campaign'],
        });
        if (!user) {
            throw new common_1.NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return user;
    }
    /**
     * Obtener usuario por email
     */
    async findByEmail(email) {
        return this.userRepository.findOne({
            where: { email },
            relations: ['role', 'role.permissions'],
        });
    }
    /**
     * Actualizar usuario
     */
    async update(id, updateUserDto) {
        const user = await this.findOne(id);
        Object.assign(user, updateUserDto);
        const updatedUser = await this.userRepository.save(user);
        this.logger.log(`Usuario actualizado: ${updatedUser.email}`);
        return updatedUser;
    }
    /**
     * Eliminar usuario (soft delete)
     */
    async remove(id) {
        const user = await this.findOne(id);
        await this.userRepository.update(id, {
            status: user_entity_1.UserStatus.INACTIVE,
        });
        this.logger.log(`Usuario desactivado: ${user.email}`);
    }
    /**
     * Cambiar contraseña
     */
    async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(id, {
            password: hashedPassword,
        });
        this.logger.log(`Contraseña actualizada para usuario ID: ${id}`);
    }
    /**
     * Actualizar estado del agente
     */
    async updateAgentState(id, state) {
        await this.userRepository.update(id, {
            agentState: state,
            lastActivityAt: new Date(),
        });
        return this.findOne(id);
    }
    /**
     * Incrementar contador de chats
     */
    async incrementChatCount(id) {
        await this.userRepository.increment({ id }, 'currentChatsCount', 1);
    }
    /**
     * Decrementar contador de chats (nunca baja de 0)
     */
    async decrementChatCount(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (user && user.currentChatsCount > 0) {
            await this.userRepository.decrement({ id }, 'currentChatsCount', 1);
        }
        else if (user) {
            // Si está en 0 o negativo, forzar a 0
            user.currentChatsCount = 0;
            await this.userRepository.save(user);
        }
    }
    /**
     * Obtener agentes disponibles para asignación
     * Solo incluye agentes que:
     * 1. Estén en la campaña
     * 2. Estén activos
     * 3. Estén disponibles (no en pausa, no ocupados)
     * 4. Tengan capacidad para más chats
     * 5. Tengan jornada laboral activa (trabajando)
     */
    async getAvailableAgents(campaignId) {
        // Obtener agentes que cumplan criterios básicos
        const candidateAgents = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .where('user.campaignId = :campaignId', { campaignId })
            .andWhere('user.status = :status', { status: user_entity_1.UserStatus.ACTIVE })
            .andWhere('user.agentState = :agentState', { agentState: user_entity_1.AgentState.AVAILABLE })
            .andWhere('user.currentChatsCount < user.maxConcurrentChats')
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
                }
                else {
                    this.logger.debug(`Agente ${agent.fullName} excluido: ${workday?.currentStatus || 'sin jornada'}`);
                }
            }
            catch (error) {
                // Si no tiene jornada activa, no está disponible
                this.logger.debug(`Agente ${agent.fullName} sin jornada laboral activa`);
            }
        }
        this.logger.log(`Agentes disponibles: ${availableAgents.length} de ${candidateAgents.length} candidatos`);
        return availableAgents;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => workday_service_1.WorkdayService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        workday_service_1.WorkdayService])
], UsersService);
