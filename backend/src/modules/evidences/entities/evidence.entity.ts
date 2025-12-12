import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Chat } from '../../chats/entities/chat.entity';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';

export enum EvidenceType {
  PAID = 'paid',
  PROMISE = 'promise',
  TRANSFER = 'transfer',
}

@Entity('evidences')
export class Evidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  ticketNumber: string;

  @Column({ type: 'enum', enum: EvidenceType })
  closureType: EvidenceType;

  @Column({ type: 'text' })
  filePath: string; // Ruta del PDF cifrado

  @Column({ length: 255 })
  fileName: string;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  chatId: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true, length: 100 })
  clientName: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true, length: 100 })
  agentName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number; // Monto recuperado o prometido

  @Column({ type: 'timestamp', nullable: true })
  promiseDate: Date; // Solo para promesas

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
