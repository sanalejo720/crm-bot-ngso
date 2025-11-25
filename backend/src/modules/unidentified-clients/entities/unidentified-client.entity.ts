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
import { Chat } from '../../chats/entities/chat.entity';
import { User } from '../../users/entities/user.entity';

export enum UnidentifiedClientStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  RESOLVED = 'resolved',
  TRANSFERRED = 'transferred',
}

@Entity('unidentified_clients')
@Index(['phone'])
@Index(['status'])
@Index(['createdAt'])
export class UnidentifiedClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  documentType: string;

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: UnidentifiedClientStatus,
    default: UnidentifiedClientStatus.PENDING,
  })
  status: UnidentifiedClientStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @ManyToOne(() => Chat, { nullable: true })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column({ nullable: true })
  chatId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  assignedToId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
