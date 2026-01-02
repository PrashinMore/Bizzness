import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'customer_notes' })
@Index(['customerId'])
export class CustomerNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  customer!: Customer;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'text' })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

