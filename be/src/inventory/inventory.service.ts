import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Product, InventoryType } from '../products/entities/product.entity';
import { RecipesService } from '../recipes/recipes.service';
import { RecipeUnit } from '../recipes/entities/recipe-item.entity';
import { StockService } from '../stock/stock.service';

/**
 * One normalised stock requirement: "for outlet X, deduct N integer base
 * units of product P". Every code path — simple products and exploded
 * recipe ingredients alike — goes through this shape, so the underlying
 * `stock` table only ever sees one kind of write.
 */
export interface StockRequirement {
  productId: string;
  /** In base units (g / ml / pcs) — see toBaseUnits(). Always a positive int. */
  quantity: number;
}

export interface SaleLineInput {
  productId: string;
  quantity: number;
}

/**
 * InventoryService sits between SalesService and StockService. Its jobs:
 *   1. Expand each sale line into concrete stock requirements
 *      (NONE → nothing, SIMPLE → self, RECIPE → ingredients × qty).
 *   2. Aggregate duplicates so stock is checked/written once per productId
 *      (matters when two dishes share an ingredient).
 *   3. Validate the full basket first, then deduct — never partial.
 *   4. Participate in the caller's transaction via an EntityManager.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly stockService: StockService,
    private readonly recipesService: RecipesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Given the sale lines, builds the aggregated list of stock requirements
   * that must be satisfied. Never writes to the DB.
   *
   * Caller must pass `products` keyed by productId — we rely on SalesService
   * having already loaded + org-scoped these.
   */
  async buildRequirements(
    lines: SaleLineInput[],
    productMap: Map<string, Product>,
    organizationId: string,
    outletId: string,
    manager: EntityManager,
  ): Promise<StockRequirement[]> {
    // 1. Preload recipes for any RECIPE-typed dish in one query.
    const recipeProductIds = lines
      .map((l) => productMap.get(l.productId))
      .filter(
        (p): p is Product => !!p && p.inventoryType === InventoryType.RECIPE,
      )
      .map((p) => p.id);

    const recipeMap = await this.recipesService.resolveRecipesForProducts(
      recipeProductIds,
      organizationId,
      outletId,
      manager,
    );

    // 2. Walk every sale line and collect its raw requirements.
    const aggregated = new Map<string, number>();
    const bump = (productId: string, quantity: number) => {
      aggregated.set(productId, (aggregated.get(productId) ?? 0) + quantity);
    };

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) {
        // SalesService already throws on missing products, but we guard again
        // here so this service can be used standalone from a future
        // "sync-from-csv" or "scheduled waste" job.
        throw new BadRequestException(`Product ${line.productId} not found`);
      }

      if (product.trackInventory === false) continue;

      switch (product.inventoryType) {
        case InventoryType.NONE:
          break;

        case InventoryType.SIMPLE:
          bump(product.id, line.quantity);
          break;

        case InventoryType.RECIPE: {
          const recipe = recipeMap.get(product.id);
          if (!recipe || !recipe.items || recipe.items.length === 0) {
            // We fail loudly rather than silently falling back to SIMPLE: a
            // chef expects selling a dish to move ingredient stock, not the
            // dish's own (likely zero) stock. A missing recipe is a config
            // bug that the operator should fix before more sales happen.
            throw new BadRequestException(
              `Product "${product.name}" is marked RECIPE but has no recipe configured`,
            );
          }
          for (const ing of recipe.items) {
            const perDishBase = this.toBaseUnits(
              Number(ing.quantity),
              ing.unit,
            );
            bump(ing.ingredientProductId, perDishBase * line.quantity);
          }
          break;
        }

        default:
          throw new BadRequestException(
            `Unknown inventoryType on product ${product.id}`,
          );
      }
    }

    // 3. Emit deterministic list (sorted by productId) for stable logs/tests.
    return Array.from(aggregated.entries())
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }

  /**
   * Throws BadRequestException with the FIRST shortfall encountered.
   * We fetch all relevant stock rows in one query so validation is O(1)
   * round-trips regardless of basket size.
   */
  async validateStock(
    requirements: StockRequirement[],
    outletId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (requirements.length === 0) return;

    const productIds = requirements.map((r) => r.productId);
    const stockMap = await this.stockService.getStockForProducts(
      productIds,
      outletId,
      manager,
    );

    // Load product names in one shot purely for human-readable errors.
    const products = await manager.getRepository(Product).find({
      where: { id: In(productIds) },
      select: { id: true, name: true },
    });
    const nameMap = new Map(products.map((p) => [p.id, p.name]));

    for (const req of requirements) {
      const available = stockMap.get(req.productId)?.quantity ?? 0;
      if (available < req.quantity) {
        const name = nameMap.get(req.productId) ?? req.productId;
        throw new BadRequestException(
          `Insufficient stock for "${name}". Available: ${available}, Required: ${req.quantity}`,
        );
      }
    }
  }

  /**
   * Performs the actual decrement. Must be called AFTER validateStock on
   * the same requirements list. Still re-checks non-negativity via
   * StockService.adjustStock as a defensive belt-and-braces.
   */
  async deductStock(
    requirements: StockRequirement[],
    outletId: string,
    manager: EntityManager,
  ): Promise<void> {
    for (const req of requirements) {
      if (req.quantity === 0) continue;
      await this.stockService.adjustStock(
        req.productId,
        outletId,
        -req.quantity,
        manager,
      );
    }
  }

  /**
   * Convenience: validate then deduct. Exactly what SalesService needs.
   * Kept as a separate method so jobs that only want dry-run validation
   * (e.g. a "can this order be fulfilled?" preflight) can call validateStock
   * alone.
   */
  async consumeForSale(
    lines: SaleLineInput[],
    productMap: Map<string, Product>,
    organizationId: string,
    outletId: string,
    manager: EntityManager,
  ): Promise<StockRequirement[]> {
    const requirements = await this.buildRequirements(
      lines,
      productMap,
      organizationId,
      outletId,
      manager,
    );
    await this.validateStock(requirements, outletId, manager);
    await this.deductStock(requirements, outletId, manager);
    return requirements;
  }

  // ---------------------------------------------------------------------------
  // Unit conversion (kept intentionally tiny — do not over-engineer)
  // ---------------------------------------------------------------------------

  /**
   * Converts a recipe quantity into the base unit expected by the `stock`
   * table (integer g / ml / pcs).
   *
   * Why Math.ceil on fractional grams? Under-deducting raw material is worse
   * than slightly over-deducting: the first hides shrinkage, the second
   * surfaces it as a legitimate low-stock signal. For pcs we keep it
   * strictly integer — fractional pcs would indicate a recipe entry error
   * that deserves an exception rather than silent rounding.
   */
  private toBaseUnits(quantity: number, unit: RecipeUnit): number {
    switch (unit) {
      case RecipeUnit.G:
        return Math.ceil(quantity);
      case RecipeUnit.KG:
        return Math.ceil(quantity * 1000);
      case RecipeUnit.ML:
        return Math.ceil(quantity);
      case RecipeUnit.L:
        return Math.ceil(quantity * 1000);
      case RecipeUnit.PCS:
        if (!Number.isInteger(quantity)) {
          throw new BadRequestException(
            `Recipe quantity for unit "pcs" must be an integer (got ${quantity})`,
          );
        }
        return quantity;
      default:
        throw new BadRequestException(
          `Unsupported recipe unit: ${String(unit)}`,
        );
    }
  }
}
