// Backups Module - NGS&O CRM Gestión
// Módulo para gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';
import { EmailService } from '../../common/services/email.service';
import { Backup } from './entities/backup.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Backup, User])],
  controllers: [BackupsController],
  providers: [BackupsService, EmailService],
  exports: [BackupsService],
})
export class BackupsModule {}
