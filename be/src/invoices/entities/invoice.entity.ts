import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Sale } from '../../sales/entities/sale.entity';

@Entity({ name: 'invoices' })
@Index(['organizationId', 'invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branchId?: string | null;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'billing_session_id' })
  billingSession?: Sale | null;

  @Column({ type: 'uuid', nullable: true, unique: true, name: 'billing_session_id' })
  billingSessionId?: string | null;

  @Column({ type: 'text', name: 'invoice_number' })
  invoiceNumber!: string;

  @Column({ type: 'text', name: 'invoice_prefix' })
  invoicePrefix!: string;

  @Column({ type: 'int', name: 'invoice_serial' })
  invoiceSerial!: number;

  @Column({ type: 'text', nullable: true, name: 'invoice_period' })
  invoicePeriod?: string | null;

  @Column({ type: 'text', nullable: true, name: 'customer_name' })
  customerName?: string | null;

  @Column({ type: 'text', nullable: true, name: 'customer_phone' })
  customerPhone?: string | null;

  @Column({ type: 'text', nullable: true, name: 'customer_gstin' })
  customerGstin?: string | null;

  @Column({ type: 'jsonb', name: 'items' })
  items!: Array<{
    productId: string;
    name: string;
    quantity: number;
    rate: number;
    total: number;
    tax?: number;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'subtotal' })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'tax_amount' })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'discount_amount' })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total' })
  total!: number;

  @Column({ type: 'text', nullable: true, name: 'pdf_url' })
  pdfUrl?: string | null;

  @Column({ type: 'text', nullable: true, name: 'html_snapshot' })
  htmlSnapshot?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

