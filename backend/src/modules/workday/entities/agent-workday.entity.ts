import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgentPause } from './agent-pause.entity';
import { AgentWorkdayEvent } from './agent-workday-event.entity';

export enum WorkdayStatus {
  OFFLINE = 'offline',
  WORKING = 'working',
  ON_PAUSE = 'on_pause',
}

@Entity('agent_workdays')
export class AgentWorkday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column('date')
  workDate: Date;

  @Column('timestamp', { nullable: true })
  clockInTime: Date;

  @Column('timestamp', { nullable: true })
  clockOutTime: Date;

  @Column('integer', { default: 0 })
  totalWorkMinutes: number;

  @Column('integer', { default: 0 })
  totalPauseMinutes: number;

  @Column('integer', { default: 0 })
  totalProductiveMinutes: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: WorkdayStatus.OFFLINE,
  })
  currentStatus: WorkdayStatus;

  @Column('integer', { default: 0 })
  chatsHandled: number;

  @Column('integer', { default: 0 })
  messagesSent: number;

  @Column('integer', { default: 0 })
  avgResponseTimeSeconds: number;

  @Column('text', { nullable: true })
  notes: string;

  @OneToMany(() => AgentPause, (pause) => pause.workday)
  pauses: AgentPause[];

  @OneToMany(() => AgentWorkdayEvent, (event) => event.workday)
  events: AgentWorkdayEvent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
