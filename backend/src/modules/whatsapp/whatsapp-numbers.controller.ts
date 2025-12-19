// WhatsApp Numbers Management Controller - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { WhatsappNumbersService } from './whatsapp-numbers.service';
import { CreateWhatsappNumberDto } from './dto/create-whatsapp-number.dto';
import { UpdateWhatsappNumberDto } from './dto/update-whatsapp-number.dto';

@ApiTags('whatsapp-numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('whatsapp-numbers')
export class WhatsappNumbersController {
  constructor(private readonly whatsappNumbersService: WhatsappNumbersService) {}

  @Post()
  @RequirePermissions({ module: 'whatsapp', action: 'create' })
  @ApiOperation({ summary: 'Crear nuevo número WhatsApp' })
  @ApiResponse({ status: 201, description: 'Número creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createDto: CreateWhatsappNumberDto) {
    return this.whatsappNumbersService.create(createDto);
  }

  @Get()
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Listar todos los números WhatsApp' })
  @ApiResponse({ status: 200, description: 'Lista de números' })
  findAll() {
    return this.whatsappNumbersService.findAll();
  }

  @Get('active')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Listar números activos' })
  @ApiResponse({ status: 200, description: 'Lista de números activos' })
  findAllActive() {
    return this.whatsappNumbersService.findAllActive();
  }

  @Get(':id')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Obtener número por ID' })
  @ApiResponse({ status: 200, description: 'Número encontrado' })
  @ApiResponse({ status: 404, description: 'Número no encontrado' })
  findOne(@Param('id') id: string) {
    return this.whatsappNumbersService.findOne(id);
  }

  @Post(':id/wppconnect/start')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Iniciar sesión WPPConnect y obtener QR' })
  @ApiResponse({ status: 200, description: 'QR generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Número no encontrado' })
  async startWppConnect(@Param('id') id: string) {
    return await this.whatsappNumbersService.startWppConnectSession(id);
  }

  @Get(':id/wppconnect/status')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Obtener estado de conexión WPPConnect' })
  @ApiResponse({ status: 200, description: 'Estado obtenido' })
  getWppConnectStatus(@Param('id') id: string) {
    return this.whatsappNumbersService.getWppConnectStatus(id);
  }

  @Post(':id/wppconnect/disconnect')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Desconectar sesión WPPConnect' })
  @ApiResponse({ status: 200, description: 'Sesión desconectada' })
  disconnectWppConnect(@Param('id') id: string) {
    return this.whatsappNumbersService.disconnectWppConnect(id);
  }

  @Post(':id/meta/configure')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Configurar Meta Cloud API' })
  @ApiResponse({ status: 200, description: 'Meta API configurada' })
  async configureMeta(
    @Param('id') id: string,
    @Body() config: { accessToken: string; phoneNumberId: string; businessAccountId: string },
  ) {
    return await this.whatsappNumbersService.configureMeta(id, config);
  }

  @Post(':id/meta/verify')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Verificar conexión Meta Cloud API' })
  @ApiResponse({ status: 200, description: 'Conexión verificada' })
  verifyMeta(@Param('id') id: string) {
    return this.whatsappNumbersService.verifyMetaConnection(id);
  }

  @Patch(':id')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Actualizar número WhatsApp' })
  @ApiResponse({ status: 200, description: 'Número actualizado' })
  @ApiResponse({ status: 404, description: 'Número no encontrado' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWhatsappNumberDto) {
    return this.whatsappNumbersService.update(id, updateDto);
  }

  @Patch(':id/campaign/:campaignId')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Asignar número a campaña (legacy)' })
  @ApiResponse({ status: 200, description: 'Número asignado a campaña' })
  assignToCampaign(@Param('id') id: string, @Param('campaignId') campaignId: string) {
    return this.whatsappNumbersService.assignToCampaign(id, campaignId);
  }

  @Patch(':id/campaigns')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Asignar número a múltiples campañas' })
  @ApiResponse({ status: 200, description: 'Número asignado a campañas' })
  assignToCampaigns(@Param('id') id: string, @Body() body: { campaignIds: string[] }) {
    return this.whatsappNumbersService.assignToCampaigns(id, body.campaignIds || []);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'whatsapp', action: 'delete' })
  @ApiOperation({ summary: 'Eliminar número WhatsApp' })
  @ApiResponse({ status: 200, description: 'Número eliminado' })
  @ApiResponse({ status: 404, description: 'Número no encontrado' })
  remove(@Param('id') id: string) {
    return this.whatsappNumbersService.remove(id);
  }

  @Get('sessions/active')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Obtener todas las sesiones activas con estadísticas' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones activas' })
  getActiveSessions() {
    return this.whatsappNumbersService.getActiveSessions();
  }

  @Post(':id/session/close')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Cerrar sesión activa manualmente' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  forceCloseSession(@Param('id') id: string) {
    return this.whatsappNumbersService.forceCloseSession(id);
  }

  @Post('sessions/close-all')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Cerrar todas las sesiones activas' })
  @ApiResponse({ status: 200, description: 'Sesiones cerradas exitosamente' })
  closeAllSessions() {
    return this.whatsappNumbersService.closeAllSessions();
  }

  @Get('sessions/can-create')
  @RequirePermissions({ module: 'whatsapp', action: 'read' })
  @ApiOperation({ summary: 'Verificar si se puede crear una nueva sesión' })
  @ApiResponse({ status: 200, description: 'Validación de límite de sesiones' })
  canCreateNewSession() {
    return this.whatsappNumbersService.canCreateNewSession();
  }

  @Post(':id/cleanup-zombies')
  @RequirePermissions({ module: 'whatsapp', action: 'update' })
  @ApiOperation({ summary: 'Limpiar procesos zombies de Chromium para una sesión' })
  @ApiResponse({ status: 200, description: 'Procesos zombies limpiados exitosamente' })
  @ApiResponse({ status: 404, description: 'Número no encontrado' })
  cleanupZombieProcesses(@Param('id') id: string) {
    return this.whatsappNumbersService.cleanupZombieProcesses(id);
  }
}
