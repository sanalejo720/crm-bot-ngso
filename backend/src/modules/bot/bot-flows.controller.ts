import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { BotFlowsService } from './bot-flows.service';
import {
  CreateBotFlowDto,
  UpdateBotFlowDto,
  CreateBotNodeDto,
  UpdateBotNodeDto,
  BulkCreateNodesDto,
} from './dto/bot-flow.dto';

@ApiTags('Bot Flows')
@Controller('bot-flows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BotFlowsController {
  constructor(private readonly botFlowsService: BotFlowsService) {}

  /**
   * Listar todos los flujos
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos los flujos de bot' })
  @RequirePermissions({ module: 'bot', action: 'read' })
  async findAll(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.botFlowsService.findAll(status, +page, +limit);
    return {
      message: 'Flujos recuperados exitosamente',
      data: result.data,
      meta: {
        page: +page,
        limit: +limit,
        total: result.total,
        totalPages: Math.ceil(result.total / +limit),
      },
    };
  }

  /**
   * Obtener flujo por ID con sus nodos
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener flujo por ID con sus nodos' })
  @RequirePermissions({ module: 'bot', action: 'read' })
  async findOne(@Param('id') id: string) {
    const flow = await this.botFlowsService.findOneWithNodes(id);
    return {
      message: 'Flujo recuperado exitosamente',
      data: flow,
    };
  }

  /**
   * Crear nuevo flujo
   */
  @Post()
  @ApiOperation({ summary: 'Crear nuevo flujo de bot' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async create(@Body() createDto: CreateBotFlowDto) {
    const flow = await this.botFlowsService.create(createDto);
    return {
      message: 'Flujo creado exitosamente',
      data: flow,
    };
  }

  /**
   * Actualizar flujo
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar flujo de bot' })
  @RequirePermissions({ module: 'bot', action: 'update' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateBotFlowDto) {
    const flow = await this.botFlowsService.update(id, updateDto);
    return {
      message: 'Flujo actualizado exitosamente',
      data: flow,
    };
  }

  /**
   * Eliminar flujo
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar flujo de bot' })
  @RequirePermissions({ module: 'bot', action: 'delete' })
  async remove(@Param('id') id: string) {
    await this.botFlowsService.remove(id);
  }

  /**
   * Duplicar flujo
   */
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar flujo de bot' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async duplicate(@Param('id') id: string) {
    const flow = await this.botFlowsService.duplicate(id);
    return {
      message: 'Flujo duplicado exitosamente',
      data: flow,
    };
  }

  /**
   * Publicar flujo (cambiar a ACTIVE)
   */
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar flujo de bot' })
  @RequirePermissions({ module: 'bot', action: 'update' })
  async publish(@Param('id') id: string) {
    const flow = await this.botFlowsService.publish(id);
    return {
      message: 'Flujo publicado exitosamente',
      data: flow,
    };
  }

  // ==================== NODOS ====================

  /**
   * Crear nodo individual
   */
  @Post(':flowId/nodes')
  @ApiOperation({ summary: 'Crear un nodo en el flujo' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async createNode(
    @Param('flowId') flowId: string,
    @Body() createDto: CreateBotNodeDto,
  ) {
    const node = await this.botFlowsService.createNode(flowId, createDto);
    return {
      message: 'Nodo creado exitosamente',
      data: node,
    };
  }

  /**
   * Crear múltiples nodos
   */
  @Post(':flowId/nodes/bulk')
  @ApiOperation({ summary: 'Crear múltiples nodos en el flujo' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async createNodesBulk(
    @Param('flowId') flowId: string,
    @Body() bulkDto: BulkCreateNodesDto,
  ) {
    const nodes = await this.botFlowsService.createNodesBulk(flowId, bulkDto.nodes);
    return {
      message: `${nodes.length} nodos creados exitosamente`,
      data: nodes,
    };
  }

  /**
   * Actualizar nodo
   */
  @Put(':flowId/nodes/:nodeId')
  @ApiOperation({ summary: 'Actualizar un nodo' })
  @RequirePermissions({ module: 'bot', action: 'update' })
  async updateNode(
    @Param('flowId') flowId: string,
    @Param('nodeId') nodeId: string,
    @Body() updateDto: UpdateBotNodeDto,
  ) {
    const node = await this.botFlowsService.updateNode(nodeId, updateDto);
    return {
      message: 'Nodo actualizado exitosamente',
      data: node,
    };
  }

  /**
   * Eliminar nodo
   */
  @Delete(':flowId/nodes/:nodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un nodo' })
  @RequirePermissions({ module: 'bot', action: 'delete' })
  async removeNode(
    @Param('flowId') flowId: string,
    @Param('nodeId') nodeId: string,
  ) {
    await this.botFlowsService.removeNode(nodeId);
  }

  /**
   * Obtener estadísticas del flujo
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas del flujo' })
  @RequirePermissions({ module: 'bot', action: 'read' })
  async getStats(@Param('id') id: string) {
    const stats = await this.botFlowsService.getStats(id);
    return {
      message: 'Estadísticas recuperadas exitosamente',
      data: stats,
    };
  }
}
