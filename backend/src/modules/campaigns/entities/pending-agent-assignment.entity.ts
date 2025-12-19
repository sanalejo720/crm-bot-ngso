import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity('pending_agent_assignments')
export class PendingAgentAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  phone: string;

  @Column({ name: 'agent_email', type: 'varchar', length: 255, nullable: false })
  agentEmail: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'template_sid', type: 'varchar', length: 50, nullable: false })
  templateSid: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: false })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  assigned: boolean;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
