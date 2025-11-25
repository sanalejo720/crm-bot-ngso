import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nuevo rol
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    this.logger.log(`Creando rol: ${createRoleDto.name}`);

    // Verificar si ya existe
    const existing = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existing) {
      throw new ConflictException(`El rol "${createRoleDto.name}" ya existe`);
    }

    // Obtener permisos
    let permissions: Permission[] = [];
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      permissions = await this.permissionRepository.findByIds(createRoleDto.permissionIds);
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      permissions,
    });

    const savedRole = await this.roleRepository.save(role);

    this.eventEmitter.emit('role.created', savedRole);

    return this.findOne(savedRole.id);
  }

  /**
   * Obtener todos los roles
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Obtener rol por ID
   */
  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Rol ${id} no encontrado`);
    }

    return role;
  }

  /**
   * Obtener rol por nombre
   */
  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  /**
   * Actualizar rol
   */
  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // Verificar nombre único si se cambia
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existing) {
        throw new ConflictException(`El rol "${updateRoleDto.name}" ya existe`);
      }
    }

    // Actualizar permisos si se proporcionan
    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionRepository.findByIds(updateRoleDto.permissionIds);
      role.permissions = permissions;
    }

    // Actualizar otros campos
    if (updateRoleDto.name) role.name = updateRoleDto.name;
    if (updateRoleDto.description !== undefined) role.description = updateRoleDto.description;

    const updatedRole = await this.roleRepository.save(role);

    this.eventEmitter.emit('role.updated', updatedRole);

    return this.findOne(updatedRole.id);
  }

  /**
   * Agregar permisos al rol
   */
  async addPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(id);

    const newPermissions = await this.permissionRepository.findByIds(permissionIds);

    // Evitar duplicados
    const existingIds = role.permissions.map((p) => p.id);
    const toAdd = newPermissions.filter((p) => !existingIds.includes(p.id));

    role.permissions = [...role.permissions, ...toAdd];

    return this.roleRepository.save(role);
  }

  /**
   * Remover permisos del rol
   */
  async removePermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(id);

    role.permissions = role.permissions.filter((p) => !permissionIds.includes(p.id));

    return this.roleRepository.save(role);
  }

  /**
   * Eliminar rol
   */
  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Verificar si hay usuarios con este rol
    if (role.users && role.users.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol "${role.name}" porque tiene ${role.users.length} usuario(s) asignado(s)`,
      );
    }

    await this.roleRepository.remove(role);

    this.eventEmitter.emit('role.deleted', { roleId: id, roleName: role.name });

    this.logger.log(`Rol ${role.name} eliminado`);
  }

  /**
   * Verificar si un rol tiene un permiso específico
   */
  async hasPermission(roleId: string, module: string, action: string): Promise<boolean> {
    const role = await this.findOne(roleId);

    return role.permissions.some(
      (p) => p.module === module && p.action === action,
    );
  }

  /**
   * Obtener todos los permisos
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { module: 'ASC', action: 'ASC' },
    });
  }

  /**
   * Crear permisos por defecto (seed)
   */
  async seedPermissions(): Promise<void> {
    this.logger.log('Creando permisos por defecto...');

    const modules = [
      'users',
      'roles',
      'campaigns',
      'whatsapp',
      'chats',
      'messages',
      'clients',
      'tasks',
      'bot',
      'reports',
      'audit',
      'settings',
      'templates',
    ];

    const actions = ['create', 'read', 'update', 'delete'];

    // Permisos adicionales específicos por módulo
    const specialPermissions = [
      { module: 'chats', action: 'assign' },
      { module: 'chats', action: 'transfer' },
      { module: 'chats', action: 'close' },
      { module: 'chats', action: 'manage' },
      { module: 'users', action: 'activate' },
      { module: 'users', action: 'deactivate' },
      { module: 'campaigns', action: 'activate' },
      { module: 'campaigns', action: 'pause' },
      { module: 'reports', action: 'export' },
      { module: 'whatsapp', action: 'send' },
      { module: 'templates', action: 'use' },
    ];

    for (const module of modules) {
      for (const action of actions) {
        const existing = await this.permissionRepository.findOne({
          where: { module, action },
        });

        if (!existing) {
          const permission = this.permissionRepository.create({
            module,
            action,
            description: `${action} ${module}`,
          });

          await this.permissionRepository.save(permission);
          this.logger.log(`Permiso creado: ${module}.${action}`);
        }
      }
    }

    // Crear permisos especiales
    for (const { module, action } of specialPermissions) {
      const existing = await this.permissionRepository.findOne({
        where: { module, action },
      });

      if (!existing) {
        const permission = this.permissionRepository.create({
          module,
          action,
          description: `${action} ${module}`,
        });

        await this.permissionRepository.save(permission);
        this.logger.log(`Permiso especial creado: ${module}.${action}`);
      }
    }

    this.logger.log('Permisos por defecto creados');
  }

  /**
   * Crear roles por defecto (seed)
   */
  async seedRoles(): Promise<void> {
    this.logger.log('Creando roles por defecto...');

    // Super Admin - Todos los permisos
    const allPermissions = await this.getAllPermissions();

    let superAdmin = await this.findByName('Super Admin');
    if (!superAdmin) {
      superAdmin = this.roleRepository.create({
        name: 'Super Admin',
        description: 'Acceso completo al sistema',
        permissions: allPermissions,
      });
      await this.roleRepository.save(superAdmin);
      this.logger.log('Rol Super Admin creado');
    } else {
      // Actualizar permisos existentes
      superAdmin.permissions = allPermissions;
      await this.roleRepository.save(superAdmin);
      this.logger.log('Rol Super Admin actualizado con TODOS los permisos');
    }

    // Supervisor
    const supervisorPermissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.module IN (:...modules)', {
        modules: ['campaigns', 'chats', 'messages', 'clients', 'tasks', 'reports', 'users', 'whatsapp'],
      })
      .getMany();

    let supervisor = await this.findByName('Supervisor');
    if (!supervisor) {
      supervisor = this.roleRepository.create({
        name: 'Supervisor',
        description: 'Supervisión de operaciones y reportes',
        permissions: supervisorPermissions,
      });
      await this.roleRepository.save(supervisor);
      this.logger.log('Rol Supervisor creado');
    } else {
      // Actualizar permisos existentes
      supervisor.permissions = supervisorPermissions;
      await this.roleRepository.save(supervisor);
      this.logger.log('Rol Supervisor actualizado con nuevos permisos');
    }

    // Agente - Ahora con permisos CREATE para chats, messages y tasks
    const agentPermissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.module IN (:...modules)', {
        modules: ['chats', 'messages', 'clients', 'tasks'],
      })
      .andWhere('permission.action IN (:...actions)', {
        actions: ['read', 'create', 'update'],
      })
      .getMany();

    let agent = await this.findByName('Agente');
    if (!agent) {
      agent = this.roleRepository.create({
        name: 'Agente',
        description: 'Atención de chats y gestión de clientes',
        permissions: agentPermissions,
      });
      await this.roleRepository.save(agent);
      this.logger.log('Rol Agente creado');
    } else {
      // Actualizar permisos existentes
      agent.permissions = agentPermissions;
      await this.roleRepository.save(agent);
      this.logger.log('Rol Agente actualizado con nuevos permisos');
    }

    // Calidad
    const qualityPermissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.module IN (:...modules)', {
        modules: ['chats', 'messages', 'reports', 'audit'],
      })
      .andWhere('permission.action = :action', { action: 'read' })
      .getMany();

    let quality = await this.findByName('Calidad');
    if (!quality) {
      quality = this.roleRepository.create({
        name: 'Calidad',
        description: 'Monitoreo y auditoría de calidad',
        permissions: qualityPermissions,
      });
      await this.roleRepository.save(quality);
      this.logger.log('Rol Calidad creado');
    }

    // Auditoría
    const auditPermissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.action = :action', { action: 'read' })
      .getMany();

    let audit = await this.findByName('Auditoría');
    if (!audit) {
      audit = this.roleRepository.create({
        name: 'Auditoría',
        description: 'Acceso solo lectura para auditoría',
        permissions: auditPermissions,
      });
      await this.roleRepository.save(audit);
      this.logger.log('Rol Auditoría creado');
    }

    this.logger.log('Roles por defecto creados');
  }
}
