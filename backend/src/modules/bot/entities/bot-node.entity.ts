import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { BotFlow } from './bot-flow.entity';

export enum BotNodeType {
  MESSAGE = 'message',
  MENU = 'menu',
  INPUT = 'input',
  CONDITION = 'condition',
  API_CALL = 'api_call',
  TRANSFER_AGENT = 'transfer_agent',
  END = 'end',
}

@Entity('bot_nodes')
export class BotNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: BotNodeType,
  })
  type: BotNodeType;

  @Column({ type: 'jsonb' })
  config: {
    // MESSAGE
    message?: string;
    mediaUrl?: string;
    
    // MENU
    options?: Array<{
      id: string;
      label: string;
      value: string;
      nextNodeId: string;
    }>;
    
    // INPUT
    inputType?: 'text' | 'number' | 'email' | 'phone';
    variableName?: string;
    validation?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      errorMessage?: string;
    };
    
    // CONDITION
    conditions?: Array<{
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less';
      value: any;
      nextNodeId: string;
    }>;
    
    // API_CALL
    apiConfig?: {
      method: 'GET' | 'POST' | 'PUT';
      url: string;
      headers?: Record<string, string>;
      body?: Record<string, any>;
      responseVariable?: string;
    };
    
    // TRANSFER_AGENT
    transferReason?: string;
    transferToSkill?: string;
  };

  @Column({ nullable: true })
  nextNodeId: string;

  @Column({ type: 'int', default: 0 })
  positionX: number; // Para canvas visual

  @Column({ type: 'int', default: 0 })
  positionY: number;

  // Relations
  @ManyToOne(() => BotFlow, (flow) => flow.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flowId' })
  flow: BotFlow;

  @Column()
  flowId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
