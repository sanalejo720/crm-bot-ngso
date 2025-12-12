// Client Phone Numbers Entity - NGS&O CRM Gestión
// Gestión de múltiples números de WhatsApp por cliente
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

@Entity('client_phone_numbers')
@Index(['clientId', 'phoneNumber'])
export class ClientPhoneNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ length: 50 })
  phoneNumber: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // Número principal del cliente

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Si el número está activo o no

  @Column({ type: 'text', nullable: true })
  notes: string; // Notas sobre este número (ej: "WhatsApp laboral", "WhatsApp personal")

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastContactAt: Date; // Última vez que se contactó desde este número
}
