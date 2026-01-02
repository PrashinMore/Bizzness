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
import { Outlet } from '../../outlets/entities/outlet.entity';

export type VisitType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

@Entity({ name: 'customer_visits' })
@Index(['customerId'])
@Index(['visitedAt'])
export class CustomerVisit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  customer!: Customer;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  sale?: Sale | null;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @ManyToOne(() => Outlet, { nullable: true, onDelete: 'SET NULL' })
  outlet?: Outlet | null;

  @Column({ type: 'uuid', nullable: true })
  outletId?: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  billAmount!: number;

  @Column({ type: 'varchar', length: 20, default: 'DINE_IN' })
  visitType!: VisitType;

  @Column({ type: 'timestamptz' })
  visitedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}

