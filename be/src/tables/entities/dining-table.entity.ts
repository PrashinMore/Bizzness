import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Sale } from '../../sales/entities/sale.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  BLOCKED = 'BLOCKED',
}

@Entity({ name: 'dining_tables' })
export class DiningTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string; // T1, T2, Patio-1

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area?: string; // Indoor, Outdoor, AC, Balcony

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @OneToMany(() => Sale, (sale) => sale.table)
  sales: Sale[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
