import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo rol' })
  @RequirePermissions({ module: 'roles', action: 'create' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @RequirePermissions({ module: 'roles', action: 'read' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Obtener todos los permisos disponibles' })
  @RequirePermissions({ module: 'roles', action: 'read' })
  getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Post('seed-permissions')
  @ApiOperation({ summary: 'Crear permisos por defecto (seed)' })
  @RequirePermissions({ module: 'roles', action: 'create' })
  seedPermissions() {
    return this.rolesService.seedPermissions();
  }

  @Post('seed-roles')
  @ApiOperation({ summary: 'Crear roles por defecto (seed)' })
  @RequirePermissions({ module: 'roles', action: 'create' })
  seedRoles() {
    return this.rolesService.seedRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener rol por ID' })
  @RequirePermissions({ module: 'roles', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar rol' })
  @RequirePermissions({ module: 'roles', action: 'update' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Agregar permisos al rol' })
  @RequirePermissions({ module: 'roles', action: 'update' })
  addPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.addPermissions(id, body.permissionIds);
  }

  @Delete(':id/permissions')
  @ApiOperation({ summary: 'Remover permisos del rol' })
  @RequirePermissions({ module: 'roles', action: 'update' })
  removePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.removePermissions(id, body.permissionIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar rol' })
  @RequirePermissions({ module: 'roles', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
