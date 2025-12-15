import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Business Settings
  @Column({ type: 'varchar', length: 200, nullable: true })
  businessName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  businessLogo: string | null;

  @Column({ type: 'text', nullable: true })
  businessAddress: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gstNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail: string | null;

  // Billing Settings
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ type: 'varchar', length: 20, default: 'INV-' })
  invoicePrefix: string;

  @Column({ type: 'text', nullable: true })
  invoiceFooter: string | null;

  @Column({ type: 'varchar', length: 10, default: '₹' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'percentage' })
  defaultDiscountType: string;

  // Inventory Settings
  @Column({ type: 'int', default: 10 })
  defaultLowStockThreshold: number;

  @Column({ type: 'varchar', length: 32, default: 'unit' })
  defaultUnit: string;

  @Column({ type: 'boolean', default: true })
  stockWarningAlerts: boolean;

  // Table Management Settings
  @Column({ type: 'boolean', default: false })
  enableTables: boolean;

  @Column({ type: 'boolean', default: false })
  enableReservations: boolean;

  @Column({ type: 'boolean', default: true })
  allowTableMerge: boolean;

  @Column({ type: 'boolean', default: true })
  autoFreeTableOnPayment: boolean;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid', unique: true })
  organizationId!: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

