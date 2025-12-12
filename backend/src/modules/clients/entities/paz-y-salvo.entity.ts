// Paz y Salvo Entity - NGS&O CRM Gestión
// Entidad para certificados de paz y salvo
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';

export enum PazYSalvoStatus {
  PENDING = 'pending', // En espera (no han pasado los 5 días hábiles)
  AVAILABLE = 'available', // Disponible para descarga
  DOWNLOADED = 'downloaded', // Ya fue descargado
}

@Entity('paz_y_salvos')
@Index(['clientId', 'status'])
export class PazYSalvo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  certificateNumber: string; // Número de certificado único

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'date' })
  paymentDate: Date; // Fecha en que realizó el pago

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  paidAmount: number; // Monto pagado

  @Column({ type: 'date' })
  availableFromDate: Date; // Fecha desde cuando está disponible (paymentDate + 5 días hábiles)

  @Column({
    type: 'enum',
    enum: PazYSalvoStatus,
    default: PazYSalvoStatus.PENDING,
  })
  status: PazYSalvoStatus;

  @Column({ type: 'text', nullable: true })
  filePath: string; // Ruta del PDF generado

  @Column({ type: 'uuid', nullable: true })
  generatedBy: string; // Usuario que generó el documento

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'generatedBy' })
  generator: User;

  @Column({ type: 'timestamp', nullable: true })
  downloadedAt: Date; // Fecha de descarga

  @Column({ type: 'uuid', nullable: true })
  downloadedBy: string; // Usuario que descargó

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'downloadedBy' })
  downloader: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    originalDebtAmount?: number;
    campaignName?: string;
    agentName?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
