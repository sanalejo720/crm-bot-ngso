// Quick Replies Controller - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

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
  Request,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { QuickRepliesSeedService } from '../../scripts/seed-quick-replies.service';

@ApiTags('quick-replies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quick-replies')
export class QuickRepliesController {
  constructor(
    private readonly quickRepliesService: QuickRepliesService,
    private readonly seedService: QuickRepliesSeedService,
  ) {}

  @Post()
  @RequirePermissions({ module: 'templates', action: 'create' })
  @ApiOperation({ summary: 'Crear plantilla de mensaje rápido' })
  @ApiResponse({ status: 201, description: 'Plantilla creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Shortcut duplicado' })
  create(@Request() req, @Body() createDto: CreateQuickReplyDto) {
    return this.quickRepliesService.create(req.user.id, createDto);
  }

  @Get()
  @RequirePermissions({ module: 'templates', action: 'read' })
  @ApiOperation({ summary: 'Listar plantillas disponibles' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filtrar por campaña' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoría' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  findAll(
    @Request() req,
    @Query('campaignId') campaignId?: string,
    @Query('category') category?: string,
  ) {
    return this.quickRepliesService.findAll(req.user.id, campaignId, category);
  }

  @Get('stats')
  @RequirePermissions({ module: 'templates', action: 'read' })
  @ApiOperation({ summary: 'Obtener estadísticas de uso de plantillas' })
  @ApiResponse({ status: 200, description: 'Estadísticas de uso' })
  getStats(@Request() req) {
    return this.quickRepliesService.getStats(req.user.id);
  }

  @Get(':id')
  @RequirePermissions({ module: 'templates', action: 'read' })
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Plantilla encontrada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  findOne(@Param('id') id: string) {
    return this.quickRepliesService.findOne(id);
  }

  @Post(':id/apply')
  @RequirePermissions({ module: 'messages', action: 'create' })
  @ApiOperation({ summary: 'Aplicar plantilla con reemplazo de variables' })
  @ApiResponse({ status: 200, description: 'Contenido generado con variables reemplazadas' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async applyTemplate(
    @Param('id') id: string,
    @Body() variables: Record<string, any>,
  ) {
    const content = await this.quickRepliesService.applyTemplate(id, variables);
    return { content };
  }

  @Get('shortcut/:shortcut')
  @RequirePermissions({ module: 'templates', action: 'read' })
  @ApiOperation({ summary: 'Buscar plantilla por shortcut' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Campaña actual' })
  @ApiResponse({ status: 200, description: 'Plantilla encontrada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  findByShortcut(
    @Request() req,
    @Param('shortcut') shortcut: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.quickRepliesService.findByShortcut(shortcut, req.user.id, campaignId);
  }

  @Patch(':id')
  @RequirePermissions({ module: 'templates', action: 'update' })
  @ApiOperation({ summary: 'Actualizar plantilla' })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  update(
    @Request() req,
    @Param('id') id: string, 
    @Body() updateDto: UpdateQuickReplyDto
  ) {
    return this.quickRepliesService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'templates', action: 'delete' })
  @ApiOperation({ summary: 'Eliminar plantilla' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  remove(@Request() req, @Param('id') id: string) {
    return this.quickRepliesService.remove(id, req.user.id);
  }

  @Post('seed')
  @RequirePermissions({ module: 'templates', action: 'create' })
  @ApiOperation({ summary: 'Crear plantillas predeterminadas (seed)' })
  @ApiResponse({ status: 200, description: 'Plantillas creadas exitosamente' })
  async seedTemplates() {
    await this.seedService.seed();
    return {
      success: true,
      message: 'Plantillas predeterminadas creadas exitosamente',
    };
  }
}
