import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ASSIGN = 'assign',
  TRANSFER = 'transfer',
  EXPORT = 'export',
}

@Entity('audit_logs')
@Index(['module', 'action'])
@Index(['userId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  module: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ nullable: true })
  entityId: string;

  @Column({ nullable: true, length: 50 })
  entityType: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 500, nullable: true })
  userAgent: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
