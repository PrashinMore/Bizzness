import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'invoice_counters' })
@Index(['organizationId', 'branchId', 'period'], { unique: true })
export class InvoiceCounter {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branchId?: string | null;

  @Column({ type: 'text', name: 'period' })
  period!: string;

  @Column({ type: 'int', default: 0, name: 'last_serial' })
  lastSerial!: number;
}

