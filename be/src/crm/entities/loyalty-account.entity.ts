import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

export type LoyaltyTier = 'SILVER' | 'GOLD' | 'PLATINUM';

@Entity({ name: 'loyalty_accounts' })
@Index(['customerId'], { unique: true })
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Customer, (customer) => customer.loyaltyAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'uuid', unique: true })
  customerId!: string;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'varchar', length: 20, default: 'SILVER' })
  tier!: LoyaltyTier;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

