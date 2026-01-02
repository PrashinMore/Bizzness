import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity()
export class Expense {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 64 })
	category: string;

	@Column({ type: 'decimal', precision: 14, scale: 2 })
	amount: number;

	@Column({ type: 'text', nullable: true })
	note?: string | null;

	@Column({ type: 'timestamptz' })
	date: Date;

	// userId of creator
	@Column({ length: 120 })
	addedBy: string;

	@ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
	organization!: Organization;

	@Column({ type: 'uuid' })
	organizationId!: string;

	@Column({ type: 'uuid', nullable: true })
	outletId?: string | null;

	@CreateDateColumn()
	createdAt: Date;
}


