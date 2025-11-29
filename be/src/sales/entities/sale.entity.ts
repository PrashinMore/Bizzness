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

	@Column({ type: 'boolean', default: false })
	isPaid: boolean;

	@ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
	organization!: Organization;

	@Column({ default: '13df4863-961c-45c0-9da7-d0d14379d8fc' })
	organizationId!: string;

	@CreateDateColumn()
	createdAt: Date;
}


