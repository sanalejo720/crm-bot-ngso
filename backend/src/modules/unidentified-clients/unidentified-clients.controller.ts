import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnidentifiedClientsService } from './unidentified-clients.service';
import { CreateUnidentifiedClientDto, UpdateUnidentifiedClientDto, UpdateStatusDto } from './dto/unidentified-client.dto';

@ApiTags('Clientes No Identificados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('unidentified-clients')
export class UnidentifiedClientsController {
  constructor(private readonly unidentifiedClientsService: UnidentifiedClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente no identificado' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  create(@Body() createDto: CreateUnidentifiedClientDto) {
    return this.unidentifiedClientsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes no identificados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string, @Query('assignedTo') assignedTo?: string, @Query('search') search?: string) {
    return this.unidentifiedClientsService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 10, status, assignedTo, search);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas' })
  getStats() {
    return this.unidentifiedClientsService.getStats();
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: 'Buscar por teléfono' })
  findByPhone(@Param('phone') phone: string) {
    return this.unidentifiedClientsService.findByPhone(phone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(@Param('id') id: string) {
    return this.unidentifiedClientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() updateDto: UpdateUnidentifiedClientDto) {
    return this.unidentifiedClientsService.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado' })
  updateStatus(@Param('id') id: string, @Body() statusDto: UpdateStatusDto) {
    return this.unidentifiedClientsService.updateStatus(id, statusDto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar a usuario' })
  assignTo(@Param('id') id: string, @Body('userId') userId: string) {
    return this.unidentifiedClientsService.assignTo(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  async remove(@Param('id') id: string) {
    await this.unidentifiedClientsService.remove(id);
    return { message: 'Cliente eliminado exitosamente' };
  }
}
