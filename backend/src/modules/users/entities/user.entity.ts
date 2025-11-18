import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../roles/entities/role.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { Message } from '../../messages/entities/message.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum AgentState {
  AVAILABLE = 'available',
  BUSY = 'busy',
  BREAK = 'break',
  OFFLINE = 'offline',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['status'])
@Index(['agentState'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ nullable: true, length: 255 })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isAgent: boolean;

  @Column({
    type: 'enum',
    enum: AgentState,
    default: AgentState.OFFLINE,
  })
  agentState: AgentState;

  @Column({ type: 'int', default: 0 })
  maxConcurrentChats: number;

  @Column({ type: 'int', default: 0 })
  currentChatsCount: number;

  @Column({ type: 'simple-array', nullable: true })
  skills: string[];

  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Relations
  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ nullable: true })
  roleId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.users, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ nullable: true })
  campaignId: string;

  @OneToMany(() => Chat, (chat) => chat.assignedAgent)
  assignedChats: Chat[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
