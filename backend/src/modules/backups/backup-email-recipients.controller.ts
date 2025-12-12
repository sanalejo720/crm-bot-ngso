// Backup Email Recipients Controller - NGS&O CRM Gestión
// Endpoints para gestión de correos electrónicos de backup
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupEmailRecipientsService } from './backup-email-recipients.service';
import { CreateBackupEmailRecipientDto, UpdateBackupEmailRecipientDto } from './dto/backup-email-recipient.dto';

@ApiTags('backup-email-recipients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('backups/email-recipients')
export class BackupEmailRecipientsController {
  constructor(private readonly recipientsService: BackupEmailRecipientsService) {}

  @Get()
  @RequirePermissions({ module: 'backups', action: 'read' })
  @ApiOperation({ 
    summary: 'Listar todos los destinatarios de email de backup',
    description: 'Obtiene la lista de correos electrónicos que reciben las contraseñas de backup'
  })
  @ApiResponse({ status: 200, description: 'Lista de destinatarios' })
  async findAll() {
    const recipients = await this.recipientsService.findAll();
    
    return {
      success: true,
      data: recipients.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isActive: r.isActive,
        createdAt: r.createdAt,
        addedBy: r.addedBy ? {
          id: r.addedBy.id,
          name: r.addedBy.fullName,
        } : null,
      })),
    };
  }

  @Post()
  @RequirePermissions({ module: 'backups', action: 'create' })
  @ApiOperation({ 
    summary: 'Agregar nuevo destinatario de email de backup',
    description: 'Agrega un nuevo correo electrónico para recibir las contraseñas de backup'
  })
  @ApiResponse({ status: 201, description: 'Destinatario agregado exitosamente' })
  async create(
    @Body() dto: CreateBackupEmailRecipientDto,
    @CurrentUser() user: any,
  ) {
    const recipient = await this.recipientsService.create(dto, user.id);
    
    return {
      success: true,
      message: 'Destinatario agregado exitosamente',
      data: {
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        isActive: recipient.isActive,
        createdAt: recipient.createdAt,
      },
    };
  }

  @Put(':id')
  @RequirePermissions({ module: 'backups', action: 'update' })
  @ApiOperation({ 
    summary: 'Actualizar destinatario de email de backup',
    description: 'Modifica el correo electrónico o estado de un destinatario'
  })
  @ApiResponse({ status: 200, description: 'Destinatario actualizado exitosamente' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBackupEmailRecipientDto,
  ) {
    const recipient = await this.recipientsService.update(id, dto);
    
    return {
      success: true,
      message: 'Destinatario actualizado exitosamente',
      data: {
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        isActive: recipient.isActive,
        updatedAt: recipient.updatedAt,
      },
    };
  }

  @Delete(':id')
  @RequirePermissions({ module: 'backups', action: 'delete' })
  @ApiOperation({ 
    summary: 'Eliminar destinatario de email de backup',
    description: 'Elimina un correo electrónico de la lista de destinatarios'
  })
  @ApiResponse({ status: 200, description: 'Destinatario eliminado exitosamente' })
  async remove(@Param('id') id: string) {
    await this.recipientsService.remove(id);
    
    return {
      success: true,
      message: 'Destinatario eliminado correctamente',
    };
  }
}
