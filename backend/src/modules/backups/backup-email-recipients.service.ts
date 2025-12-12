// Backup Email Recipients Service - NGS&O CRM Gestión
// Servicio para gestión de correos electrónicos de backup
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BackupEmailRecipient } from './entities/backup-email-recipient.entity';
import { CreateBackupEmailRecipientDto, UpdateBackupEmailRecipientDto } from './dto/backup-email-recipient.dto';

@Injectable()
export class BackupEmailRecipientsService {
  private readonly logger = new Logger(BackupEmailRecipientsService.name);

  constructor(
    @InjectRepository(BackupEmailRecipient)
    private recipientRepo: Repository<BackupEmailRecipient>,
    private configService: ConfigService,
  ) {}

  /**
   * Obtener todos los correos destinatarios
   */
  async findAll(): Promise<BackupEmailRecipient[]> {
    return this.recipientRepo.find({
      relations: ['addedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener todos los correos activos
   */
  async findActive(): Promise<BackupEmailRecipient[]> {
    return this.recipientRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener lista de emails activos como array de strings
   */
  async getActiveEmails(): Promise<string[]> {
    const recipients = await this.findActive();
    
    // Si no hay destinatarios configurados, usar el de la variable de entorno
    if (recipients.length === 0) {
      const defaultEmail = this.configService.get<string>('BACKUP_EMAIL_RECIPIENT');
      if (defaultEmail) {
        return [defaultEmail];
      }
      return [];
    }
    
    return recipients.map(r => r.email);
  }

  /**
   * Crear un nuevo destinatario
   */
  async create(dto: CreateBackupEmailRecipientDto, userId?: string): Promise<BackupEmailRecipient> {
    // Verificar si el email ya existe
    const existing = await this.recipientRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`El correo ${dto.email} ya está registrado`);
    }

    const recipient = this.recipientRepo.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      isActive: true,
      addedById: userId,
    });

    const saved = await this.recipientRepo.save(recipient);
    this.logger.log(`✅ Nuevo destinatario de backup agregado: ${dto.email}`);
    
    return saved;
  }

  /**
   * Actualizar un destinatario
   */
  async update(id: string, dto: UpdateBackupEmailRecipientDto): Promise<BackupEmailRecipient> {
    const recipient = await this.recipientRepo.findOne({ where: { id } });
    
    if (!recipient) {
      throw new NotFoundException('Destinatario no encontrado');
    }

    // Si se cambia el email, verificar que no exista
    if (dto.email && dto.email.toLowerCase() !== recipient.email) {
      const existing = await this.recipientRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });

      if (existing) {
        throw new ConflictException(`El correo ${dto.email} ya está registrado`);
      }
      
      recipient.email = dto.email.toLowerCase();
    }

    if (dto.name !== undefined) {
      recipient.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      recipient.isActive = dto.isActive;
    }

    const saved = await this.recipientRepo.save(recipient);
    this.logger.log(`✅ Destinatario de backup actualizado: ${saved.email}`);
    
    return saved;
  }

  /**
   * Eliminar un destinatario
   */
  async remove(id: string): Promise<void> {
    const recipient = await this.recipientRepo.findOne({ where: { id } });
    
    if (!recipient) {
      throw new NotFoundException('Destinatario no encontrado');
    }

    await this.recipientRepo.remove(recipient);
    this.logger.log(`🗑️ Destinatario de backup eliminado: ${recipient.email}`);
  }

  /**
   * Inicializar con el email por defecto si no hay ninguno
   */
  async initializeDefaultRecipient(): Promise<void> {
    const count = await this.recipientRepo.count();
    
    if (count === 0) {
      const defaultEmail = this.configService.get<string>('BACKUP_EMAIL_RECIPIENT');
      
      if (defaultEmail) {
        await this.recipientRepo.save({
          email: defaultEmail.toLowerCase(),
          name: 'Gerencia (Configuración inicial)',
          isActive: true,
        });
        
        this.logger.log(`✅ Destinatario por defecto inicializado: ${defaultEmail}`);
      }
    }
  }
}
