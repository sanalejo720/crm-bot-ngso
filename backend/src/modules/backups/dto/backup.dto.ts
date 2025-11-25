// Backup DTOs - NGS&O CRM Gestión
// DTOs para gestión de backups
// Desarrollado por: Alejandro Sandoval - AS Software

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BackupType } from '../entities/backup.entity';

export class CreateBackupDto {
  @ApiProperty({ enum: BackupType, default: BackupType.MANUAL })
  @IsEnum(BackupType)
  @IsOptional()
  type?: BackupType;

  @ApiProperty({ description: 'Notas adicionales sobre el backup', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class DownloadBackupDto {
  @ApiProperty({ description: 'Contraseña maestra para descifrar el backup' })
  @IsString()
  password: string;
}

export class BackupResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  status: string;
  type: string;
  isEncrypted: boolean;
  createdAt: Date;
  completedAt?: Date;
  createdBy?: {
    id: string;
    name: string;
  };
  metadata?: any;
}

export class BackupScheduleDto {
  @ApiProperty({ enum: ['daily', 'weekly', 'monthly'], description: 'Frecuencia del backup automático' })
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ description: 'Hora del día para ejecutar (formato 24h: 0-23)', example: 2 })
  hour: number;
}
