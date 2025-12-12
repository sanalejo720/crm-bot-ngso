import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendMessageDto, SendMediaMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear mensaje (uso interno)' })
  @RequirePermissions({ module: 'messages', action: 'create' })
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Enviar mensaje de texto' })
  @RequirePermissions({ module: 'messages', action: 'create' })
  sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser('id') senderId: string,
  ) {
    return this.messagesService.sendTextMessage(
      sendMessageDto.chatId,
      senderId,
      sendMessageDto.content,
    );
  }

  @Post('send-media')
  @ApiOperation({ summary: 'Enviar mensaje con media' })
  @RequirePermissions({ module: 'messages', action: 'create' })
  sendMediaMessage(
    @Body() sendMediaDto: SendMediaMessageDto,
    @CurrentUser('id') senderId: string,
  ) {
    return this.messagesService.sendMediaMessage(
      sendMediaDto.chatId,
      senderId,
      sendMediaDto.mediaUrl,
      sendMediaDto.mediaType as any,
      sendMediaDto.caption,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener mensajes por chatId (query param)' })
  @RequirePermissions({ module: 'messages', action: 'read' })
  findMessages(
    @Query('chatId') chatId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    if (!chatId) {
      return { success: false, message: 'chatId is required' };
    }
    return this.messagesService.findByChatId(chatId, { limit, offset });
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Obtener mensajes de un chat' })
  @RequirePermissions({ module: 'messages', action: 'read' })
  findByChatId(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.messagesService.findByChatId(chatId, { limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener mensaje por ID' })
  @RequirePermissions({ module: 'messages', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar mensaje como leído' })
  @RequirePermissions({ module: 'messages', action: 'update' })
  markMessageAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(id);
  }

  @Post('chat/:chatId/mark-read')
  @ApiOperation({ summary: 'Marcar mensajes como leídos' })
  @RequirePermissions({ module: 'messages', action: 'update' })
  markAsRead(@Param('chatId') chatId: string) {
    return this.messagesService.markAsRead(chatId);
  }

  @Get('chat/:chatId/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de mensajes' })
  @RequirePermissions({ module: 'messages', action: 'read' })
  getStats(@Param('chatId') chatId: string) {
    return this.messagesService.getStats(chatId);
  }

  @Get(':id/download-media')
  @ApiOperation({ summary: 'Descargar archivo multimedia de un mensaje' })
  @RequirePermissions({ module: 'messages', action: 'read' })
  async downloadMedia(@Param('id') id: string, @Res() res: Response) {
    const message = await this.messagesService.findOne(id);
    
    if (!message || !message.mediaUrl) {
      throw new NotFoundException('Mensaje o archivo multimedia no encontrado');
    }

    const filePath = path.join(process.cwd(), message.mediaUrl.replace(/^\//, ''));
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    const fileName = message.mediaFileName || path.basename(filePath);
    res.download(filePath, fileName);
  }
}
