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
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { BotFlow } from '../../bot/entities/bot-flow.entity';

export enum WhatsappProvider {
  META_CLOUD = 'meta',
  WPPCONNECT = 'wppconnect',
  TWILIO = 'twilio',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  QR_WAITING = 'qr_waiting',
  ERROR = 'error',
}

@Entity('whatsapp_numbers')
@Index(['phoneNumber'], { unique: true })
@Index(['status'])
export class WhatsappNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  phoneNumber: string; // Formato: 5491134567890

  @Column({ length: 50 })
  displayName: string;

  @Column({
    type: 'enum',
    enum: WhatsappProvider,
  })
  provider: WhatsappProvider;

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.DISCONNECTED,
  })
  status: ConnectionStatus;

  @Column({ nullable: true })
  @Exclude()
  phoneNumberId: string; // Para Meta Cloud API

  @Column({ nullable: true })
  @Exclude()
  accessToken: string; // Para Meta Cloud API

  @Column({ nullable: true })
  @Exclude()
  sessionName: string; // Para WPPConnect

  @Column({ nullable: true })
  @Exclude()
  apiKey: string; // Para WPPConnect

  @Column({ nullable: true })
  @Exclude()
  serverUrl: string; // Para WPPConnect

  @Column({ nullable: true })
  @Exclude()
  twilioAccountSid: string; // Para Twilio

  @Column({ nullable: true })
  @Exclude()
  twilioAuthToken: string; // Para Twilio

  @Column({ nullable: true })
  twilioPhoneNumber: string; // Para Twilio (formato: whatsapp:+14155238886)

  @Column({ type: 'text', nullable: true })
  @Exclude()
  qrCode: string;

  @Column({ type: 'timestamp', nullable: true })
  lastConnectedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  webhookConfig: {
    url?: string;
    secret?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Campaign, (campaign) => campaign.whatsappNumbers)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ nullable: true })
  campaignId: string;

  @ManyToOne(() => BotFlow, { nullable: true })
  @JoinColumn({ name: 'botFlowId' })
  botFlow: BotFlow;

  @Column({ nullable: true })
  botFlowId: string;

  @OneToMany(() => Chat, (chat) => chat.whatsappNumber)
  chats: Chat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
