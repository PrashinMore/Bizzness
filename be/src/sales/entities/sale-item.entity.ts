import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from './sale.entity';

@Entity()
export class SaleItem {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
	sale: Sale;

	@Column({ type: 'uuid' })
	productId: string;

	@Column({ type: 'int' })
	quantity: number;

	@Column({ type: 'decimal', precision: 12, scale: 2 })
	sellingPrice: number;

	@Column({ type: 'decimal', precision: 14, scale: 2 })
	subtotal: number;
}


