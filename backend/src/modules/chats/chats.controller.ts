import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { AssignChatDto, TransferChatDto } from './dto/assign-chat.dto';
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
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo chat' })
  @RequirePermissions({ module: 'chats', action: 'create' })
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatsService.create(createChatDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los chats (solo supervisores)' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  findAll(
    @Query('status') status?: ChatStatus,
    @Query('campaignId') campaignId?: string,
    @Query('assignedAgentId') assignedAgentId?: string,
    @Query('whatsappNumberId') whatsappNumberId?: string,
  ) {
    return this.chatsService.findAll({
      status,
      campaignId,
      assignedAgentId,
      whatsappNumberId,
    });
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Obtener mis chats asignados (agentes)' })
  getMyChats(@CurrentUser('id') userId: string) {
    return this.chatsService.findAll({ assignedAgentId: userId });
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

  @Post(':id/assign')
  @ApiOperation({ summary: 'Asignar chat a un agente' })
  @RequirePermissions({ module: 'chats', action: 'assign' })
  assign(@Param('id') id: string, @Body() assignDto: AssignChatDto) {
    return this.chatsService.assign(id, assignDto.agentId);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar/Reasignar chat a un agente (para supervisores)' })
  @RequirePermissions({ module: 'chats', action: 'assign' })
  reassign(@Param('id') id: string, @Body() assignDto: AssignChatDto) {
    return this.chatsService.assign(id, assignDto.agentId);
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

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transferir chat a otro agente' })
  @RequirePermissions({ module: 'chats', action: 'transfer' })
  transfer(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Body() transferDto: TransferChatDto,
  ) {
    return this.chatsService.transfer(
      id,
      currentUserId,
      transferDto.newAgentId,
      transferDto.reason,
    );
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Cerrar chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.chatsService.close(id, userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolver chat' })
  @RequirePermissions({ module: 'chats', action: 'update' })
  resolve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.chatsService.resolve(id, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de un agente' })
  @RequirePermissions({ module: 'chats', action: 'read' })
  getAgentStats(@Param('id') agentId: string) {
    return this.chatsService.getAgentStats(agentId);
  }
}
