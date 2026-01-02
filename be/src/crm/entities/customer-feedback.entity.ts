import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Sale } from '../../sales/entities/sale.entity';

export type FeedbackStatus = 'OPEN' | 'RESOLVED';

@Entity({ name: 'customer_feedback' })
@Index(['customerId'])
@Index(['status'])
export class CustomerFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  customer!: Customer;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  order?: Sale | null;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @Column({ type: 'int' })
  rating!: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status!: FeedbackStatus;

  @CreateDateColumn()
  createdAt!: Date;
}

