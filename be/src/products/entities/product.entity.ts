import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 120 })
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  sellingPrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ length: 32 })
  unit: string;

  @Column({ type: 'int', default: 10 })
  lowStockThreshold: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isLowStock(): boolean {
    return this.stock < this.lowStockThreshold;
  }
}

