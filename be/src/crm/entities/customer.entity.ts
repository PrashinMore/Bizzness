import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CustomerVisit } from './customer-visit.entity';
import { CustomerNote } from './customer-note.entity';
import { CustomerFeedback } from './customer-feedback.entity';
import { LoyaltyAccount } from './loyalty-account.entity';

export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER' | null;

@Entity({ name: 'customers' })
@Index(['phone', 'organizationId'], { unique: true })
@Index(['lastVisitAt'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'date', nullable: true })
  birthday?: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: CustomerGender;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'int', default: 0 })
  totalVisits!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalSpend!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  avgOrderValue!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastVisitAt?: Date | null;

  @OneToMany(() => CustomerVisit, (visit) => visit.customer)
  visits!: CustomerVisit[];

  @OneToMany(() => CustomerNote, (note) => note.customer)
  notes!: CustomerNote[];

  @OneToMany(() => CustomerFeedback, (feedback) => feedback.customer)
  feedbacks!: CustomerFeedback[];

  @OneToOne(() => LoyaltyAccount, (loyalty) => loyalty.customer)
  loyaltyAccount?: LoyaltyAccount;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

