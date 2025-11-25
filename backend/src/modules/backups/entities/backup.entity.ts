// Backup Entity - NGS&O CRM Gestión
// Entidad para gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BackupStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum BackupType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'bigint' })
  fileSize: number; // Tamaño en bytes

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PROCESSING,
  })
  status: BackupStatus;

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.MANUAL,
  })
  type: BackupType;

  @Column({ type: 'varchar', length: 100 })
  passwordHash: string; // Hash bcrypt de la contraseña de cifrado

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    databaseSize?: number;
    filesSize?: number;
    totalRecords?: number;
    tablesIncluded?: string[];
    compressionRatio?: number;
  };

  // Relación con el usuario que creó el backup
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
