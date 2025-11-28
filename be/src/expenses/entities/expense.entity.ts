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

	@Column({ default: '13df4863-961c-45c0-9da7-d0d14379d8fc' })
	organizationId!: string;

	@CreateDateColumn()
	createdAt: Date;
}


