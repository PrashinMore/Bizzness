import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Recipe } from './recipe.entity';

/**
 * Canonical measurement units for recipes and ingredient stock.
 * Conversions are handled in the InventoryService at runtime — we never
 * persist a converted value here so recipe rows remain human-auditable
 * ("200 g butter" stays "200 g butter" in the DB).
 */
export enum RecipeUnit {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  L = 'l',
  PCS = 'pcs',
}

@Entity({ name: 'recipe_item' })
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  recipe!: Recipe;

  @Column({ type: 'uuid' })
  recipeId!: string;

  /**
   * Ingredient is itself a Product row. This keeps the stock table as the
   * single source of truth: both "simple dish" and "ingredient" stock live in
   * one place.
   */
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  ingredientProduct!: Product;

  @Column({ type: 'uuid' })
  ingredientProductId!: string;

  /**
   * Decimal so recipes like "12.5 g saffron" or "0.5 pcs lemon" survive.
   * Stock itself is stored as integer in base units (g/ml/pcs); see
   * InventoryService for the conversion + rounding policy.
   */
  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity!: number;

  @Column({ type: 'varchar', length: 8, enum: RecipeUnit })
  unit!: RecipeUnit;
}
