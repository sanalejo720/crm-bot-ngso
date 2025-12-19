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
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { WhatsappNumber } from '../../whatsapp/entities/whatsapp-number.entity';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Message } from '../../messages/entities/message.entity';

export enum ChatStatus {
  WAITING = 'waiting', // En cola
  BOT = 'bot', // Atendido por bot
  ACTIVE = 'active', // Con agente asignado
  PENDING = 'pending', // Esperando respuesta del cliente
  RESOLVED = 'resolved', // Resuelto
  CLOSED = 'closed', // Cerrado
}

export enum ChatChannel {
  WHATSAPP = 'whatsapp',
}

@Entity('chats')
@Index(['status'])
@Index(['assignedAgentId'])
@Index(['createdAt'])
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  externalId: string; // ID del chat en WhatsApp

  @Column({ length: 20 })
  contactPhone: string;

  @Column({ nullable: true, length: 100 })
  contactName: string;

  @Column({
    type: 'enum',
    enum: ChatChannel,
    default: ChatChannel.WHATSAPP,
  })
  channel: ChatChannel;

  @Column({
    type: 'enum',
    enum: ChatStatus,
    default: ChatStatus.WAITING,
  })
  status: ChatStatus;

  @Column({ type: 'text', nullable: true })
  lastMessageText: string;

  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  priority: number; // 0=normal, 1=high, 2=urgent

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  botContext: {
    sessionId?: string;
    flowId?: string;
    currentNodeId?: string;
    variables?: Record<string, any>;
    transferredToAgent?: boolean;
    closureType?: 'paid' | 'promise';
  };

  // Relations
  @ManyToOne(() => Campaign, (campaign) => campaign.chats)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column()
  campaignId: string;

  @ManyToOne(() => WhatsappNumber, (number) => number.chats, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber;

  @Column({ nullable: true })
  whatsappNumberId: string;

  @ManyToOne(() => User, (user) => user.assignedChats, { nullable: true })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent: User;

  @Column({ nullable: true })
  assignedAgentId: string;

  @ManyToOne(() => Client, (client) => client.chats, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  debtorId: string;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  // ============ NUEVOS CAMPOS - SISTEMA DE ESTADOS ============

  @Column({ name: 'sub_status', nullable: true })
  subStatus?: string;

  @Column({ name: 'is_bot_active', default: false })
  isBotActive: boolean;

  @Column({ name: 'last_agent_message_at', type: 'timestamp', nullable: true })
  lastAgentMessageAt?: Date;

  @Column({ name: 'last_client_message_at', type: 'timestamp', nullable: true })
  lastClientMessageAt?: Date;

  @Column({ name: 'first_response_time_seconds', nullable: true })
  firstResponseTimeSeconds?: number;

  @Column({ name: 'agent_warning_sent', default: false })
  agentWarningSent: boolean;

  @Column({ name: 'client_warning_sent', default: false })
  clientWarningSent: boolean;

  @Column({ name: 'auto_close_scheduled_at', type: 'timestamp', nullable: true })
  autoCloseScheduledAt?: Date;

  @Column({ name: 'transfer_count', default: 0 })
  transferCount: number;

  @Column({ name: 'bot_restart_count', default: 0 })
  botRestartCount: number;

  // ============ CAMPOS DE RESOLUCIÓN ============

  @Column({ name: 'resolution_type', nullable: true })
  resolutionType?: string; // paid, promise, no_agreement, callback

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string;

  @Column({ name: 'resolution_metadata', type: 'jsonb', nullable: true })
  resolutionMetadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
