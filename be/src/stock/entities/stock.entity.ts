import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Outlet } from '../../outlets/entities/outlet.entity';

@Entity({ name: 'stock' })
@Unique(['productId', 'outletId'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  product!: Product;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Outlet, { nullable: false, onDelete: 'CASCADE' })
  outlet!: Outlet;

  @Column({ type: 'uuid' })
  outletId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

