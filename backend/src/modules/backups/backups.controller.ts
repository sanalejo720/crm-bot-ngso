// Backups Controller - NGS&O CRM Gestión
// Endpoints para gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupsService } from './backups.service';
import { CreateBackupDto, DownloadBackupDto } from './dto/backup.dto';

@ApiTags('backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post()
  @RequirePermissions({ module: 'backups', action: 'create' })
  @ApiOperation({ 
    summary: 'Crear nuevo backup cifrado',
    description: 'Genera un backup completo de la base de datos y archivos, cifrado con AES-256. Retorna la contraseña maestra ÚNICA VEZ.'
  })
  @ApiResponse({
    status: 201,
    description: 'Backup creado exitosamente. La contraseña maestra se retorna solo en esta respuesta.',
  })
  async create(
    @Body() createBackupDto: CreateBackupDto,
    @CurrentUser() user: any,
  ) {
    const backup = await this.backupsService.createBackup(createBackupDto, user.id);
    
    return {
      success: true,
      message: 'Backup iniciado. GUARDA LA CONTRASEÑA MAESTRA, no se volverá a mostrar.',
      data: {
        id: backup.id,
        fileName: backup.fileName,
        status: backup.status,
        masterPassword: (backup as any).masterPassword, // Solo aquí se devuelve
        createdAt: backup.createdAt,
      },
    };
  }

  @Get()
  @RequirePermissions({ module: 'backups', action: 'read' })
  @ApiOperation({ summary: 'Listar todos los backups' })
  async findAll() {
    const backups = await this.backupsService.findAll();
    
    return {
      success: true,
      data: backups.map(b => ({
        id: b.id,
        fileName: b.fileName,
        fileSize: b.fileSize,
        status: b.status,
        type: b.type,
        isEncrypted: b.isEncrypted,
        createdAt: b.createdAt,
        completedAt: b.completedAt,
        createdBy: b.createdBy ? {
          id: b.createdBy.id,
          name: b.createdBy.fullName,
        } : null,
        metadata: b.metadata,
      })),
    };
  }

  @Get(':id')
  @RequirePermissions({ module: 'backups', action: 'read' })
  @ApiOperation({ summary: 'Obtener detalles de un backup' })
  async findOne(@Param('id') id: string) {
    const backup = await this.backupsService.findOne(id);
    
    return {
      success: true,
      data: {
        id: backup.id,
        fileName: backup.fileName,
        fileSize: backup.fileSize,
        status: backup.status,
        type: backup.type,
        isEncrypted: backup.isEncrypted,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt,
        errorMessage: backup.errorMessage,
        createdBy: backup.createdBy ? {
          id: backup.createdBy.id,
          name: backup.createdBy.fullName,
          email: backup.createdBy.email,
        } : null,
        metadata: backup.metadata,
      },
    };
  }

  @Post(':id/download')
  @RequirePermissions({ module: 'backups', action: 'download' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Descargar backup cifrado',
    description: 'Descarga el archivo de backup. Requiere la contraseña maestra para descifrar.'
  })
  async download(
    @Param('id') id: string,
    @Body() downloadDto: DownloadBackupDto,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.backupsService.downloadBackup(
      id,
      downloadDto.password,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'backups', action: 'delete' })
  @ApiOperation({ summary: 'Eliminar un backup' })
  async remove(@Param('id') id: string) {
    await this.backupsService.remove(id);
    
    return {
      success: true,
      message: 'Backup eliminado correctamente',
    };
  }
}
