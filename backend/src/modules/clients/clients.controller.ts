import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeadStatus } from './entities/client.entity';

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @RequirePermissions({ module: 'clients', action: 'create' })
  create(@Body() createClientDto: CreateClientDto, @CurrentUser() user: any) {
    return this.clientsService.create(createClientDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los clientes con filtros' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  findAll(
    @Query('search') search?: string,
    @Query('leadStatus') leadStatus?: LeadStatus,
    @Query('campaignId') campaignId?: string,
    @Query('tags') tags?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.clientsService.findAll({
      search,
      leadStatus,
      campaignId,
      tags: tags ? tags.split(',') : undefined,
      assignedTo,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de clientes' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  getStats(@Query('campaignId') campaignId?: string) {
    return this.clientsService.getStats(campaignId);
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Buscar clientes duplicados' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  findDuplicates() {
    return this.clientsService.findDuplicates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Patch(':id/lead-status')
  @ApiOperation({ summary: 'Cambiar estado del lead' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  updateLeadStatus(@Param('id') id: string, @Body() body: { leadStatus: LeadStatus }) {
    return this.clientsService.updateLeadStatus(id, body.leadStatus);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Agregar nota interna' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  addNote(@Param('id') id: string, @Body() body: { note: string }, @CurrentUser() user: any) {
    return this.clientsService.addNote(id, body.note, user.sub);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Agregar tags al cliente' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  addTags(@Param('id') id: string, @Body() body: { tags: string[] }) {
    return this.clientsService.addTags(id, body.tags);
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remover tags del cliente' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  removeTags(@Param('id') id: string, @Body() body: { tags: string[] }) {
    return this.clientsService.removeTags(id, body.tags);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar cliente a usuario' })
  @RequirePermissions({ module: 'clients', action: 'update' })
  assignTo(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.clientsService.assignTo(id, body.userId);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Importar clientes en lote' })
  @RequirePermissions({ module: 'clients', action: 'create' })
  bulkImport(@Body() body: { clients: CreateClientDto[] }, @CurrentUser() user: any) {
    return this.clientsService.bulkImport(body.clients, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  @RequirePermissions({ module: 'clients', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
