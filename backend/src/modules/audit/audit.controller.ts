import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener logs de auditoría con filtros' })
  @RequirePermissions({ module: 'audit', action: 'read' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      userId,
      module,
      action,
      entityType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de auditoría' })
  @RequirePermissions({ module: 'audit', action: 'read' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Obtener logs por entidad específica' })
  @RequirePermissions({ module: 'audit', action: 'read' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener logs por usuario' })
  @RequirePermissions({ module: 'audit', action: 'read' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findByUser(userId, limit ? parseInt(limit) : 100);
  }
}
