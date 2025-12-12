import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgentWorkday } from './agent-workday.entity';

export enum PauseType {
  LUNCH = 'lunch',
  BREAK = 'break',
  BATHROOM = 'bathroom',
  MEETING = 'meeting',
  OTHER = 'other',
}

@Entity('agent_pauses')
export class AgentPause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workdayId: string;

  @ManyToOne(() => AgentWorkday, (workday) => workday.pauses)
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
  pauseType: PauseType;

  @Column('timestamp')
  startTime: Date;

  @Column('timestamp', { nullable: true })
  endTime: Date;

  @Column('integer', { nullable: true })
  durationMinutes: number;

  @Column('text', { nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
