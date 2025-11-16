import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
} from 'typeorm';

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

	@CreateDateColumn()
	createdAt: Date;
}


