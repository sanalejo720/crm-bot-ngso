// Backup Email Recipient Entity - NGS&O CRM Gestión
// Almacena los correos electrónicos que reciben las contraseñas de backup
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('backup_email_recipients')
export class BackupEmailRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  addedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'addedById' })
  addedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
