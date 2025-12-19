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
import { Campaign } from '../../campaigns/entities/campaign.entity';

export enum PaymentSource {
  EVIDENCE = 'evidence',         // Pago registrado por evidencia
  MANUAL = 'manual',            // Pago registrado manualmente
  BOT_PROMISE = 'bot_promise',  // Promesa de pago del bot confirmada
  INTEGRATION = 'integration',  // Pago desde integración externa
}

export enum PaymentStatus {
  CONFIRMED = 'confirmed',      // Pago confirmado
  PENDING = 'pending',          // Pendiente de verificación
  REJECTED = 'rejected',        // Pago rechazado
}

@Entity('payment_records')
@Index(['paymentDate'])
@Index(['agentId', 'paymentDate'])
@Index(['campaignId', 'paymentDate'])
@Index(['clientId'])
@Index(['status'])
export class PaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  // Monto pagado
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  // Deuda original del cliente al momento del pago
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  originalDebt: number;

  // Deuda restante después del pago
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  remainingDebt: number;

  // Porcentaje de recuperación (amount / originalDebt * 100)
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  recoveryPercentage: number;

  // Fecha del pago
  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentSource,
    default: PaymentSource.MANUAL,
  })
  source: PaymentSource;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.CONFIRMED,
  })
  status: PaymentStatus;

  // ID de referencia (evidencia, promesa, etc.)
  @Column({ type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadata adicional
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
