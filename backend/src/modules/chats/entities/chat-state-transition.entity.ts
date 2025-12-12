import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_state_transitions')
export class ChatStateTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id' })
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @Column({ name: 'from_status' })
  fromStatus: string;

  @Column({ name: 'to_status' })
  toStatus: string;

  @Column({ name: 'from_sub_status', nullable: true })
  fromSubStatus?: string;

  @Column({ name: 'to_sub_status', nullable: true })
  toSubStatus?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'triggered_by' })
  triggeredBy: 'system' | 'agent' | 'supervisor' | 'bot' | 'client';

  @Column({ name: 'agent_id', nullable: true })
  agentId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
