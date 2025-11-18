import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { UserStatus } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @RequirePermissions({ module: 'users', action: 'create' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @RequirePermissions({ module: 'users', action: 'read' })
  findAll(
    @Query('status') status?: UserStatus,
    @Query('roleId') roleId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('isAgent') isAgent?: string,
  ) {
    const isAgentBool = isAgent === 'true';
    return this.usersService.findAll({ status, roleId, campaignId, isAgent: isAgentBool });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @RequirePermissions({ module: 'users', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @RequirePermissions({ module: 'users', action: 'update' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  @RequirePermissions({ module: 'users', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('campaign/:campaignId/available')
  @ApiOperation({ summary: 'Obtener agentes disponibles de una campaña' })
  @RequirePermissions({ module: 'users', action: 'read' })
  getAvailableAgents(@Param('campaignId') campaignId: string) {
    return this.usersService.getAvailableAgents(campaignId);
  }
}
