import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentType {
  CC = 'CC', // Cédula de Ciudadanía
  CE = 'CE', // Cédula de Extranjería
  NIT = 'NIT', // Número de Identificación Tributaria
  TI = 'TI', // Tarjeta de Identidad
  PASSPORT = 'PASSPORT', // Pasaporte
}

@Entity('debtors')
@Index(['documentType', 'documentNumber'], { unique: true })
@Index(['phone'])
export class Debtor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Información personal
  @Column({ length: 200 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column({ length: 50 })
  documentNumber: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ length: 500, nullable: true })
  address: string;

  // Información de deuda
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debtAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  initialDebtAmount: number;

  @Column({ type: 'int', default: 0 })
  daysOverdue: number; // Días de mora

  @Column({ type: 'date', nullable: true })
  lastPaymentDate: Date;

  @Column({ type: 'date', nullable: true })
  promiseDate: Date; // Fecha de promesa de pago

  // Estado
  @Column({ length: 50, default: 'active' })
  status: string; // active, paid, negotiating, defaulted

  // Información adicional
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    producto?: string;
    numeroCredito?: string;
    fechaVencimiento?: string;
    [key: string]: any;
  };

  // Auditoría
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastContactedAt: Date;
}
