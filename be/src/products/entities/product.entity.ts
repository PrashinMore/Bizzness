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

/**
 * Declares how a sale line for this product affects inventory.
 * SIMPLE is the default so every existing row keeps working without a
 * data migration beyond setting a default — see migrate-recipe-inventory.ts.
 */
export enum InventoryType {
  /** No stock tracking at all (services, digital items, etc.). */
  NONE = 'NONE',
  /** Legacy 1:1 behaviour: selling 1 deducts 1 from this product's stock. */
  SIMPLE = 'SIMPLE',
  /** Selling 1 explodes the active recipe and deducts ingredient stock instead. */
  RECIPE = 'RECIPE',
}

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

  @Column({ length: 32 })
  unit: string;

  @Column({ type: 'int', default: 10 })
  lowStockThreshold: number;

  /**
   * Master switch. When false, sales of this product never touch stock.
   * Defaults to true so existing rows behave exactly as before.
   */
  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  /**
   * Decides the deduction strategy at checkout time. Stored as varchar so
   * Postgres doesn't need a dedicated enum type (keeps migrations trivial
   * across environments).
   */
  @Column({
    type: 'varchar',
    length: 16,
    default: InventoryType.SIMPLE,
    enum: InventoryType,
  })
  inventoryType!: InventoryType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
