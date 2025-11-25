// Quick Reply Entity - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('quick_replies')
@Index(['userId'])
@Index(['campaignId'])
@Index(['shortcut'])
@Index(['category'])
export class QuickReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Alcance: NULL = global para todos
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  campaignId: string;

  // Contenido
  @Column({ length: 50 })
  shortcut: string; // Ej: /saludo, /pago, /deuda

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  // Variables disponibles en la plantilla
  @Column({ type: 'simple-array', nullable: true })
  variables: string[]; // ['clientName', 'debtAmount', 'daysOverdue']

  // Categorización
  @Column({ length: 50, nullable: true })
  category: string; // greeting, payment, info, closing

  // Control
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  usageCount: number;

  // Auditoría
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
