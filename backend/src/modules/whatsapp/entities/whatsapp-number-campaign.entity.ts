// WhatsApp Number Campaign Entity - NGS&O CRM Gestión
// Relación muchos-a-muchos entre WhatsApp Numbers y Campaigns
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { WhatsappNumber } from './whatsapp-number.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('whatsapp_number_campaigns')
@Unique(['whatsappNumberId', 'campaignId'])
@Index(['whatsappNumberId'])
@Index(['campaignId'])
export class WhatsappNumberCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  whatsappNumberId: string;

  @Column()
  campaignId: string;

  @ManyToOne(() => WhatsappNumber, (number) => number.numberCampaigns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @CreateDateColumn()
  createdAt: Date;
}
