import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinTable,
} from 'typeorm';
import type { UserRole } from '../user-role.type';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'text', default: 'staff' })
  role!: UserRole;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt?: Date | null;

  @ManyToMany(() => Organization, (organization) => organization.users)
  @JoinTable({
    name: 'user_organizations',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'organizationId', referencedColumnName: 'id' },
  })
  organizations!: Organization[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

