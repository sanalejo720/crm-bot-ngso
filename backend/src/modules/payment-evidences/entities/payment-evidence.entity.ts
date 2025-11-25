import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';

export enum EvidenceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EvidenceType {
  IMAGE = 'image',
  PDF = 'pdf',
}

@Entity('payment_evidences')
@Index(['clientId', 'status'])
@Index(['uploadedAt'])
export class PaymentEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 500 })
  filePath: string;

  @Column({ length: 20 })
  fileType: string; // image/jpeg, image/png, application/pdf

  @Column({ type: 'int' })
  fileSize: number; // en bytes

  @Column({
    type: 'enum',
    enum: EvidenceType,
  })
  evidenceType: EvidenceType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  paymentAmount: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: EvidenceStatus,
    default: EvidenceStatus.PENDING,
  })
  status: EvidenceStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Campo para almacenar metadata adicional
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    originalName?: string;
    mimeType?: string;
    campaignId?: string;
    referenceNumber?: string;
  };
}
