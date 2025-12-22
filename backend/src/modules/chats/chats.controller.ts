import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatsService } from './chats.service';
import { ChatsExportService } from './chats-export.service';
import { AssignmentService } from './services/assignment.service';
import { ReturnToBotService } from './services/return-to-bot.service';
import { TransferService } from './services/transfer.service';
import { ChatResolutionService } from './services/chat-resolution.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { AssignChatDto, TransferChatDto } from './dto/assign-chat.dto';
import { ReturnToBotDto } from './dto/return-to-bot.dto';
import { ResolveChatDto } from './dto/resolve-chat.dto';
import { CreateManualChatDto } from './dto/create-manual-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatStatus } from './entities/chat.entity';

@ApiTags('chats')
@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatsExportService: ChatsExportService,
    private readonly assignmentService: AssignmentService,
    private readonly returnToBotService: ReturnToBotService,
    private readonly transferService: TransferService,
    private readonly chatResolutionService: ChatResolutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo chat' })
  @RequirePermissions({ module: 'chats', action: 'create' })
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatsService.create(createChatDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los chats (solo supervisores)' })
  @RequirePermissions({ module: 'chats', action: 'manage' })
  findAll(
    @Query('status') status?: ChatStatus,
    @Query('campaignId') campaignId?: string,
    @Query('assignedAgentId') assignedAgentId?: string,
    @Query('whatsappNumberId') whatsappNumberId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatsService.findAll({
      status,
      campaignId,
      assignedAgentId,
      whatsappNumberId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Obtener mis chats asignados (agentes) o todos (supervisores)' })
  getMyChats(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: { name: string },
  ) {
    // Si es Supervisor o Super Admin, devolver todos los chats para supervisión
    // EXCLUYE chats de campañas masivas sin respuestas
    if (userRole.name === 'Supervisor' || userRole.name === 'Super Admin') {
      return this.chatsService.findAll({ includeMassCampaigns: false });
    }
    // Si es Agente, solo sus chats asignados (también excluye mass campaigns sin respuesta)
    return this.chatsService.findAll({ assignedAgentId: userId, includeMassCampaigns: false });
  }

  @Get('mass-campaigns')
  @ApiOperation({ summary: 'Obtener chats de campañas masivas (incluye sin respuestas)' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  getMassCampaignChats(
    @Query('campaignName') campaignName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Incluir todos los chats de mass campaigns, filtrados por campaignName si se proporciona
    const query: any = { 
      includeMassCampaigns: true,
      campaignName: campaignName || undefined,
    };
    
    if (page) query.page = parseInt(page, 10);
    if (limit) query.limit = parseInt(limit, 10);

    return this.chatsService.findAll(query);
  }

  @Get('waiting/:campaignId')
  @ApiOperation({ summary: 'Obtener chats en cola' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  getWaitingChats(@Param('campaignId') campaignId: string) {
    return this.chatsService.getWaitingChats(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener chat por ID' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.chatsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatsService.update(id, updateChatDto);
  }

  @Get('waiting-queue')
  @ApiOperation({ summary: 'Obtener cola de chats en espera de asignación' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async getWaitingQueue(@Query('campaignId') campaignId?: string) {
    const chats = await this.assignmentService.getWaitingQueue(campaignId);
    return {
      success: true,
      data: chats,
      total: chats.length,
    };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Asignar chat a un agente desde cola de espera' })
  @RequirePermissions({ module: 'chats', action: 'assign' })
  async assign(
    @Param('id') id: string,
    @Body() assignDto: AssignChatDto,
    @CurrentUser('id') userId: string,
  ) {
    const chat = await this.assignmentService.assignChatToAgent(
      id,
      assignDto.agentId,
      userId,
    );
    return {
      success: true,
      data: chat,
      message: 'Chat asignado exitosamente',
    };
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar/Reasignar chat a un agente (para supervisores)' })
  @RequirePermissions({ module: 'chats', action: 'assign' })
  reassign(@Param('id') id: string, @Body() assignDto: AssignChatDto) {
    return this.chatsService.assign(id, assignDto.agentId, assignDto.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ChatStatus },
    @CurrentUser('id') userId: string,
  ) {
    // Si el estado es closed, usar el método close
    if (body.status === ChatStatus.CLOSED) {
      return this.chatsService.close(id, userId);
    }
    // Si el estado es resolved, usar el método resolve
    if (body.status === ChatStatus.RESOLVED) {
      return this.chatsService.resolve(id, userId);
    }
    // Para otros estados, actualizar directamente
    return this.chatsService.update(id, { status: body.status });
  }

  @Post(':id/return-to-bot')
  @ApiOperation({ summary: 'Retornar chat al bot' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  async returnToBot(
    @Param('id') id: string,
    @Body() returnDto: ReturnToBotDto,
    @CurrentUser('id') userId: string,
  ) {
    const chat = await this.returnToBotService.returnChatToBot(
      id,
      returnDto.reason,
      userId,
      returnDto.notes,
    );
    return {
      success: true,
      data: chat,
      message: 'Chat retornado al bot exitosamente',
    };
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transferir chat a otro agente' })
  @RequirePermissions({ module: 'chats', action: 'transfer' })
  async transfer(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Body() transferDto: TransferChatDto,
  ) {
    const chat = await this.transferService.transferChat(
      id,
      transferDto.newAgentId,
      currentUserId,
      transferDto.reason,
    );
    return {
      success: true,
      data: chat,
      message: 'Chat transferido exitosamente',
    };
  }

  @Get(':id/transfer-history')
  @ApiOperation({ summary: 'Obtener historial de transferencias de un chat' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async getTransferHistory(@Param('id') id: string) {
    const history = await this.transferService.getTransferHistory(id);
    return {
      success: true,
      data: history,
    };
  }

  @Patch(':id/transfer-campaign')
  @ApiOperation({ summary: 'Transferir chat a otra campaña' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  async transferToCampaign(
    @Param('id') id: string,
    @Body() body: { campaignId: string },
    @CurrentUser('id') userId: string,
  ) {
    const chat = await this.chatsService.transferToCampaign(id, body.campaignId, userId);
    return {
      success: true,
      data: chat,
      message: 'Chat transferido a otra campaña exitosamente',
    };
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Cerrar chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.chatsService.close(id, userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolver chat con resultado de gestión' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  async resolve(
    @Param('id') id: string,
    @Body() resolveDto: ResolveChatDto,
    @CurrentUser('id') userId: string,
  ) {
    const chat = await this.chatResolutionService.resolveChat(id, resolveDto, userId);
    return {
      success: true,
      data: chat,
      message: 'Chat resuelto exitosamente',
    };
  }

  @Get(':id/resolution-stats')
  @ApiOperation({ summary: 'Obtener estadísticas de resolución de un agente' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async getResolutionStats(
    @Param('id') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.chatResolutionService.getResolutionStatsByAgent(
      agentId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: stats,
    };
  }

  @Get('resolution-stats/global')
  @ApiOperation({ summary: 'Obtener estadísticas de resolución global' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async getGlobalResolutionStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const stats = await this.chatResolutionService.getGlobalResolutionStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      campaignId,
    );
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de un agente' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  getAgentStats(@Param('id') agentId: string) {
    return this.chatsService.getAgentStats(agentId);
  }

  @Post(':id/export-pdf')
  @ApiOperation({ summary: 'Enviar cierre de negociación (PDF cifrado a supervisores)' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async exportChatToPDF(
    @Param('id') id: string,
    @Body() body: { closureType: 'paid' | 'promise' },
    @CurrentUser('id') agentId: string,
  ) {
    const result = await this.chatsExportService.exportChatToPDF(
      id,
      body.closureType,
      agentId,
    );
    return {
      success: true,
      message: 'Cierre de negociación enviado exitosamente a supervisores',
      data: {
        fileName: result.fileName,
        ticketNumber: result.ticketNumber,
      },
    };
  }

  @Patch(':id/contact')
  @ApiOperation({ summary: 'Actualizar información del contacto del chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  async updateContactInfo(
    @Param('id') id: string,
    @Body() body: { contactName?: string; contactPhone?: string },
  ) {
    return this.chatsService.updateContactInfo(id, body);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Crear chat manual (agente inicia conversación con un número)' })
  @RequirePermissions({ module: 'chats', action: 'create' })
  async createManualChat(
    @Body() createManualChatDto: CreateManualChatDto,
    @CurrentUser('id') agentId: string,
    @CurrentUser('role') userRole: { name: string },
  ) {
    // Mapear nombre de rol a formato esperado por el servicio
    const roleMap: { [key: string]: string } = {
      'Super Admin': 'superadmin',
      'Administrador': 'admin',
      'Supervisor': 'supervisor',
      'Agente': 'agent',
    };
    const creatorRole = roleMap[userRole.name] || 'agent';

    const result = await this.chatsService.createManualChat(
      createManualChatDto.phone,
      agentId,
      createManualChatDto.contactName,
      createManualChatDto.campaignId,
      createManualChatDto.assignToAgentId,
      creatorRole,
      createManualChatDto.templateSid,
      createManualChatDto.templateVariables,
    );

    return {
      success: true,
      message: result.templateSent 
        ? 'Chat creado y plantilla enviada exitosamente.' 
        : result.isNew 
          ? 'Chat creado exitosamente. Puede enviar un mensaje inicial.' 
          : 'Chat existente recuperado.',
      data: {
        chat: result.chat,
        isNew: result.isNew,
        canSendMessage: result.canSendMessage,
        waitingResponse: result.waitingResponse,
        previousAgent: result.previousAgent,
        ticketHistory: result.ticketHistory,
        templateSent: result.templateSent,
        info: result.waitingResponse 
          ? 'Límite: 1 mensaje por día hasta que el cliente responda.' 
          : undefined,
      },
    };
  }

  @Get('client-history/:phone')
  @ApiOperation({ summary: 'Obtener historial de un cliente por teléfono' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async getClientHistory(
    @Param('phone') phone: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const history = await this.chatsService.getClientHistory(phone, campaignId);
    return {
      success: true,
      data: history,
    };
  }

  @Get(':id/can-send')
  @ApiOperation({ summary: 'Verificar si se puede enviar mensaje en chat manual' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  async canSendMessage(@Param('id') id: string) {
    const result = await this.chatsService.canSendManualMessage(id);
    return {
      success: true,
      data: result,
    };
  }
}
