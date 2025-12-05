import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity({ name: 'organization_invoice_settings' })
export class OrganizationInvoiceSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', unique: true, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'boolean', default: true, name: 'enable_invoices' })
  enableInvoices!: boolean;

  @Column({ type: 'boolean', default: false, name: 'gst_enabled' })
  gstEnabled!: boolean;

  @Column({ type: 'text', default: 'INV', name: 'invoice_prefix' })
  invoicePrefix!: string;

  @Column({ type: 'boolean', default: true, name: 'invoice_branch_prefix' })
  invoiceBranchPrefix!: boolean;

  @Column({
    type: 'text',
    default: 'monthly',
    name: 'invoice_reset_cycle',
  })
  invoiceResetCycle!: 'never' | 'monthly' | 'yearly';

  @Column({ type: 'int', default: 5, name: 'invoice_padding' })
  invoicePadding!: number;

  @Column({
    type: 'text',
    default: 'A4',
    name: 'invoice_display_format',
  })
  invoiceDisplayFormat!: 'A4' | 'thermal';

  @Column({ type: 'boolean', default: true, name: 'include_logo' })
  includeLogo!: boolean;

  @Column({ type: 'text', nullable: true, name: 'logo_url' })
  logoUrl?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

