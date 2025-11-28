import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 120 })
  category: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  categoryEntity?: Category | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

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

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid', default: '13df4863-961c-45c0-9da7-d0d14379d8fc' })
  organizationId!: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isLowStock(): boolean {
    return this.stock < this.lowStockThreshold;
  }
}

