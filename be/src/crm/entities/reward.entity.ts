import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export type RewardType = 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';

@Entity({ name: 'rewards' })
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50 })
  type!: RewardType;

  @Column({ type: 'int' })
  pointsRequired!: number; // Points needed to redeem this reward

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountPercentage?: number | null; // For DISCOUNT_PERCENTAGE type

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount?: number | null; // For DISCOUNT_FIXED type

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderValue?: number | null; // Minimum order value required (optional, for discount types)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number | null; // Maximum discount amount (mandatory for discount types)

  @Column({ type: 'varchar', length: 200, nullable: true })
  freeItemName?: string | null; // For FREE_ITEM type

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashbackAmount?: number | null; // For CASHBACK type

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', nullable: true })
  maxRedemptions?: number | null; // Max times this reward can be redeemed (null = unlimited)

  @Column({ type: 'int', default: 0 })
  totalRedemptions!: number; // Total times redeemed

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

