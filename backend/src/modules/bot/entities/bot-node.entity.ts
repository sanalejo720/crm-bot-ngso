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
    
    // BOTONES INTERACTIVOS (para MESSAGE e INPUT)
    useButtons?: boolean; // Si es true, enviar como botones interactivos
    buttons?: Array<{
      id: string;
      text: string;
      value?: string; // Valor que se asigna a la variable
    }>;
    buttonTitle?: string; // Título del mensaje de botones
    responseNodeId?: string; // Nodo a ejecutar tras recibir respuesta
    
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
    variable?: string; // Variable principal a evaluar
    conditions?: Array<{
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'contains_ignore_case';
      value: any;
      nextNodeId: string;
      targetNodeId?: string;
    }>;
    elseNodeId?: string; // Nodo a ejecutar si ninguna condición se cumple
    defaultNodeId?: string; // Nodo por defecto cuando no hay coincidencias
    
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
