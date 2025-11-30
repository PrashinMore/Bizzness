import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../users/entities/user.entity';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

@Entity({ name: 'organization_invites' })
@Unique(['organizationId', 'email']) // Can't invite same email twice to same org
export class OrganizationInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column()
  email!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: InviteStatus;

  @Column({ type: 'uuid' })
  invitedBy!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedBy' })
  inviter!: User;

  @Column({ type: 'uuid', unique: true })
  token!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

