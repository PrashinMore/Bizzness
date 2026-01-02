import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { LoyaltyAccount } from './loyalty-account.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Sale } from '../../sales/entities/sale.entity';

export type LoyaltyTransactionType = 'EARNED' | 'REDEEMED' | 'ADJUSTED';

@Entity({ name: 'loyalty_transactions' })
@Index(['customerId', 'createdAt'])
@Index(['loyaltyAccountId', 'createdAt'])
@Index(['saleId'], { where: '"saleId" IS NOT NULL' })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => LoyaltyAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loyaltyAccountId' })
  loyaltyAccount!: LoyaltyAccount;

  @Column({ type: 'uuid' })
  loyaltyAccountId!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saleId' })
  sale?: Sale | null;

  @Column({ type: 'uuid', nullable: true })
  saleId?: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: LoyaltyTransactionType;

  @Column({ type: 'int' })
  points!: number; // Positive for earned, negative for redeemed

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  billAmount?: number | null; // Bill amount (for earned transactions)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount?: number | null; // Discount applied (for redeemed transactions)

  @Column({ type: 'int' })
  pointsBefore!: number; // Points balance before transaction

  @Column({ type: 'int' })
  pointsAfter!: number; // Points balance after transaction

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

