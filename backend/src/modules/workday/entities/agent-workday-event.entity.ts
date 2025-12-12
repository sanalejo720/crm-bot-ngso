import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgentWorkday } from './agent-workday.entity';

export enum WorkdayEventType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  PAUSE_START = 'pause_start',
  PAUSE_END = 'pause_end',
  STATUS_CHANGE = 'status_change',
}

@Entity('agent_workday_events')
export class AgentWorkdayEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  workdayId: string;

  @ManyToOne(() => AgentWorkday, (workday) => workday.events)
  @JoinColumn({ name: 'workdayId' })
  workday: AgentWorkday;

  @Column('uuid')
  agentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({
    type: 'varchar',
    length: 50,
  })
  eventType: WorkdayEventType;

  @Column('jsonb', { nullable: true })
  eventData: any;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  eventTime: Date;

  @CreateDateColumn()
  createdAt: Date;
}
