import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BotNode } from './bot-node.entity';

export enum BotFlowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

@Entity('bot_flows')
@Index(['status'])
export class BotFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: BotFlowStatus,
    default: BotFlowStatus.DRAFT,
  })
  status: BotFlowStatus;

  @Column({ nullable: true })
  startNodeId: string; // ID del nodo inicial

  @Column({ type: 'jsonb', nullable: true })
  variables: {
    [key: string]: {
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date';
      defaultValue?: any;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    maxInactivityTime?: number; // minutos
    transferToAgentOnError?: boolean;
    fallbackMessage?: string;
  };

  // Relations
  @OneToMany(() => BotNode, (node) => node.flow, { cascade: true })
  nodes: BotNode[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
