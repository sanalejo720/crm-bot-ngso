import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Chat } from '../../chats/entities/chat.entity';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
  TEMPLATE = 'template',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum MessageSenderType {
  CONTACT = 'contact',
  AGENT = 'agent',
  BOT = 'bot',
  SYSTEM = 'system',
}

@Entity('messages')
@Index(['chatId', 'createdAt'])
@Index(['status'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true, length: 100 })
  externalId: string; // ID del mensaje en WhatsApp

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({
    type: 'enum',
    enum: MessageSenderType,
  })
  senderType: MessageSenderType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true, length: 500 })
  mediaUrl: string;

  @Column({ nullable: true, length: 100 })
  mediaFileName: string;

  @Column({ nullable: true, length: 50 })
  mediaMimeType: string;

  @Column({ type: 'int', nullable: true })
  mediaSize: number;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isInternal: boolean; // Nota interna entre agentes

  // Relations
  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  chatId: string;

  @ManyToOne(() => User, (user) => user.sentMessages, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ nullable: true })
  senderId: string;

  @CreateDateColumn()
  createdAt: Date;
}
