// Backups Module - NGS&O CRM Gestión
// Módulo para gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';
import { BackupEmailRecipientsController } from './backup-email-recipients.controller';
import { BackupEmailRecipientsService } from './backup-email-recipients.service';
import { EmailService } from '../../common/services/email.service';
import { Backup } from './entities/backup.entity';
import { BackupEmailRecipient } from './entities/backup-email-recipient.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Backup, BackupEmailRecipient, User])],
  controllers: [BackupsController, BackupEmailRecipientsController],
  providers: [BackupsService, BackupEmailRecipientsService, EmailService],
  exports: [BackupsService, BackupEmailRecipientsService],
})
export class BackupsModule implements OnModuleInit {
  constructor(private recipientsService: BackupEmailRecipientsService) {}

  async onModuleInit() {
    // Inicializar destinatario por defecto si no hay ninguno
    await this.recipientsService.initializeDefaultRecipient();
  }
}
