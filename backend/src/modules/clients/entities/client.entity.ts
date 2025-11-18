import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Chat } from '../../chats/entities/chat.entity';
import { Task } from '../../tasks/entities/task.entity';

export enum ClientStatus {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  INACTIVE = 'inactive',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

@Entity('clients')
@Index(['phone'], { unique: true })
@Index(['email'])
@Index(['status'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ nullable: true, length: 100 })
  email: string;

  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.LEAD,
  })
  status: ClientStatus;

  @Column({ nullable: true, length: 100 })
  company: string;

  @Column({ nullable: true, length: 100 })
  position: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    nullable: true,
  })
  leadStatus: LeadStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ type: 'jsonb', nullable: true })
  notes: any[];

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastContactAt: Date;

  @Column({ type: 'int', default: 0 })
  interactionCount: number;

  // Campos de cobranza
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, nullable: true })
  debtAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  originalDebtAmount: number;

  @Column({ type: 'int', default: 0, nullable: true })
  daysOverdue: number;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  lastPaymentAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  promisePaymentDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  promisePaymentAmount: number;

  @Column({ length: 50, default: 'pending', nullable: true })
  collectionStatus: string;

  @Column({ length: 20, nullable: true })
  priority: string;

  @Column({ length: 50, nullable: true })
  documentNumber: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, default: 'Colombia', nullable: true })
  country: string;

  // Relations
  @OneToMany(() => Chat, (chat) => chat.client)
  chats: Chat[];

  @OneToMany(() => Task, (task) => task.client)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
