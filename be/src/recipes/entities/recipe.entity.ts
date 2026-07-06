import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Outlet } from '../../outlets/entities/outlet.entity';
import { Product } from '../../products/entities/product.entity';
import { RecipeItem } from './recipe-item.entity';

/**
 * A Recipe binds a "dish" Product (inventoryType = RECIPE) to a set of
 * ingredient products. At most one recipe exists per (productId, outletId)
 * tuple; a NULL outletId represents a global recipe that applies to every
 * outlet unless an outlet-specific override exists.
 *
 * Kept intentionally lightweight: no versioning, no yield/batch semantics.
 * Those can be layered on later without breaking this shape.
 */
@Entity({ name: 'recipe' })
@Unique('uq_recipe_product_outlet', ['productId', 'outletId'])
@Index(['organizationId'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  product!: Product;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  /** NULL = global recipe (applies to every outlet). */
  @ManyToOne(() => Outlet, { nullable: true, onDelete: 'CASCADE' })
  outlet?: Outlet | null;

  @Column({ type: 'uuid', nullable: true })
  outletId?: string | null;

  @OneToMany(() => RecipeItem, (item) => item.recipe, {
    cascade: true,
    eager: true,
  })
  items!: RecipeItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
