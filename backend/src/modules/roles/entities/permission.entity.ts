import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
@Index(['module', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  module: string; // users, chats, campaigns, reports, etc.

  @Column({ length: 50 })
  action: string; // create, read, update, delete, assign, transfer, etc.

  @Column({ nullable: true, length: 255 })
  description: string;

  // Relations
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;
}
