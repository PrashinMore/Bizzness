import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { SaleItem } from './sale-item.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { DiningTable } from '../../tables/entities/dining-table.entity';

@Entity()
export class Sale {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'timestamptz' })
	date: Date;

	@OneToMany(() => SaleItem, (item) => item.sale, {
		cascade: true,
		eager: true,
	})
	items: SaleItem[];

	@Column({ type: 'decimal', precision: 14, scale: 2 })
	totalAmount: number;

	@Column({ length: 120 })
	soldBy: string;

	@Column({ type: 'varchar', length: 20, default: 'cash' })
	paymentType: string;

	@Column({ type: 'decimal', precision: 14, scale: 2, default: 0, nullable: true })
	cashAmount?: number;

	@Column({ type: 'decimal', precision: 14, scale: 2, default: 0, nullable: true })
	upiAmount?: number;

	@Column({ type: 'boolean', default: false })
	isPaid: boolean;

	@Column({ type: 'uuid', nullable: true })
	tableId?: string | null;

	@ManyToOne(() => DiningTable, { nullable: true, onDelete: 'SET NULL' })
	table?: DiningTable | null;

	@ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
	organization!: Organization;

	@Column({ type: 'uuid' })
	organizationId!: string;

	@Column({ type: 'uuid', nullable: true })
	outletId?: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	openedAt?: Date | null;

	@Column({ type: 'timestamptz', nullable: true })
	closedAt?: Date | null;

	@CreateDateColumn()
	createdAt: Date;
}


