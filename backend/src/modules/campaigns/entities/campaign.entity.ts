import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WhatsappNumber } from '../../whatsapp/entities/whatsapp-number.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { Debtor } from '../../debtors/entities/debtor.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

@Entity('campaigns')
@Index(['status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.ACTIVE,
  })
  status: CampaignStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    autoAssignment?: boolean;
    assignmentStrategy?: 'round-robin' | 'least-busy' | 'skills-based';
    maxWaitTime?: number; // minutos
    botEnabled?: boolean;
    botFlowId?: string;
    businessHours?: {
      enabled: boolean;
      timezone: string;
      schedule: {
        [key: string]: { start: string; end: string }[];
      };
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @OneToMany(() => User, (user) => user.campaign)
  users: User[];

  @OneToMany(() => WhatsappNumber, (number) => number.campaign)
  whatsappNumbers: WhatsappNumber[];

  @OneToMany(() => Chat, (chat) => chat.campaign)
  chats: Chat[];

  @OneToMany(() => Debtor, (debtor) => debtor.campaign)
  debtors: Debtor[];

  @CreateDateColumn()
  createdAt: Date;

@Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
