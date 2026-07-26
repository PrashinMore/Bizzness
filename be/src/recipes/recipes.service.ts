import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Product, InventoryType } from '../products/entities/product.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeItem } from './entities/recipe-item.entity';
import { Recipe } from './entities/recipe.entity';

/**
 * Owns the `recipe` + `recipe_item` tables.
 *
 * Resolution rule (used by InventoryService at checkout):
 *   1. outlet-specific recipe (productId + outletId)
 *   2. global recipe (productId + outletId IS NULL)
 *
 * This mirrors how pricing / menu overrides work in most POS systems and lets
 * a chain define a default recipe centrally while individual outlets tweak it.
 */
@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeItem)
    private readonly recipeItemRepo: Repository<RecipeItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------------
  // Resolution (hot path)
  // ---------------------------------------------------------------------------

  /**
   * Returns the effective recipe for a dish at a specific outlet, preferring
   * an outlet override and falling back to the global recipe.
   * Returns null if no recipe exists — caller decides fallback policy.
   */
  async resolveRecipe(
    productId: string,
    organizationId: string,
    outletId: string | null,
    manager?: EntityManager,
  ): Promise<Recipe | null> {
    const repo = manager ? manager.getRepository(Recipe) : this.recipeRepo;

    if (outletId) {
      const specific = await repo.findOne({
        where: { productId, organizationId, outletId },
      });
      if (specific) return specific;
    }

    return repo.findOne({
      where: { productId, organizationId, outletId: IsNull() },
    });
  }

  /**
   * Batched variant for checkout: resolves recipes for many products in a
   * single round-trip instead of N queries. Returned map keys are productIds.
   */
  async resolveRecipesForProducts(
    productIds: string[],
    organizationId: string,
    outletId: string | null,
    manager?: EntityManager,
  ): Promise<Map<string, Recipe>> {
    if (productIds.length === 0) return new Map();
    const repo = manager ? manager.getRepository(Recipe) : this.recipeRepo;

    const rows = await repo.find({
      where: [
        ...(outletId
          ? [{ productId: In(productIds), organizationId, outletId }]
          : []),
        { productId: In(productIds), organizationId, outletId: IsNull() },
      ],
    });

    // Collapse outlet override + global into a single best match per product.
    const result = new Map<string, Recipe>();
    for (const recipe of rows) {
      const existing = result.get(recipe.productId);
      // Prefer outlet-specific over global when both are loaded.
      if (!existing || (recipe.outletId && !existing.outletId)) {
        result.set(recipe.productId, recipe);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async getByProduct(
    productId: string,
    organizationId: string,
    outletId?: string | null,
  ): Promise<Recipe | null> {
    return this.resolveRecipe(productId, organizationId, outletId ?? null);
  }

  async createRecipe(
    dto: CreateRecipeDto,
    organizationId: string,
  ): Promise<Recipe> {
    await this.assertProductBelongsToOrg(dto.productId, organizationId);
    await this.assertIngredientsValid(dto.items, dto.productId, organizationId);

    return this.dataSource.transaction(async (manager) => {
      // Enforce uniqueness at the service layer too so we return a clean 400
      // instead of a raw DB unique-violation error.
      const existing = await manager.getRepository(Recipe).findOne({
        where: {
          productId: dto.productId,
          organizationId,
          outletId: dto.outletId ?? IsNull(),
        },
      });
      if (existing) {
        throw new BadRequestException(
          'A recipe already exists for this product and outlet scope',
        );
      }

      const recipe = manager.getRepository(Recipe).create({
        productId: dto.productId,
        organizationId,
        outletId: dto.outletId ?? null,
      });
      const saved = await manager.getRepository(Recipe).save(recipe);

      const items = dto.items.map((item) =>
        manager.getRepository(RecipeItem).create({
          recipe: saved,
          ingredientProductId: item.ingredientProductId,
          quantity: item.quantity,
          unit: item.unit,
        }),
      );
      await manager.getRepository(RecipeItem).save(items);

      // Flip the dish to RECIPE so SalesService takes the new code path.
      // We do NOT touch trackInventory — operators may still want "NONE" for
      // promo items, which is a higher-priority override.
      await manager
        .getRepository(Product)
        .update(
          { id: dto.productId, organizationId },
          { inventoryType: InventoryType.RECIPE },
        );

      return manager.getRepository(Recipe).findOneOrFail({
        where: { id: saved.id },
        relations: ['items'],
      });
    });
  }

  async updateRecipe(
    id: string,
    dto: UpdateRecipeDto,
    organizationId: string,
  ): Promise<Recipe> {
    return this.dataSource.transaction(async (manager) => {
      const recipe = await manager.getRepository(Recipe).findOne({
        where: { id, organizationId },
        relations: ['items'],
      });
      if (!recipe) throw new NotFoundException(`Recipe ${id} not found`);

      if (dto.items) {
        await this.assertIngredientsValid(
          dto.items,
          recipe.productId,
          organizationId,
        );

        // Full replacement — simpler than diffing and safer for operators.
        await manager.getRepository(RecipeItem).delete({ recipeId: recipe.id });
        const items = dto.items.map((item) =>
          manager.getRepository(RecipeItem).create({
            recipe,
            ingredientProductId: item.ingredientProductId,
            quantity: item.quantity,
            unit: item.unit,
          }),
        );
        await manager.getRepository(RecipeItem).save(items);
      }

      return manager.getRepository(Recipe).findOneOrFail({
        where: { id: recipe.id },
        relations: ['items'],
      });
    });
  }

  async deleteRecipe(id: string, organizationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const recipe = await manager.getRepository(Recipe).findOne({
        where: { id, organizationId },
      });
      if (!recipe) throw new NotFoundException(`Recipe ${id} not found`);

      await manager.getRepository(Recipe).remove(recipe);

      // If no other recipe (global or any outlet) exists for this product,
      // revert it back to SIMPLE so the product doesn't get stuck in a
      // "RECIPE but no recipe" state that would fail every future sale.
      const stillHasRecipe = await manager
        .getRepository(Recipe)
        .count({ where: { productId: recipe.productId, organizationId } });
      if (stillHasRecipe === 0) {
        await manager
          .getRepository(Product)
          .update(
            { id: recipe.productId, organizationId },
            { inventoryType: InventoryType.SIMPLE },
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  private async assertProductBelongsToOrg(
    productId: string,
    organizationId: string,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId, organizationId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  private async assertIngredientsValid(
    items: { ingredientProductId: string; quantity: number }[],
    dishProductId: string,
    organizationId: string,
  ): Promise<void> {
    // 1. No self-reference (a dish cannot be its own ingredient).
    for (const item of items) {
      if (item.ingredientProductId === dishProductId) {
        throw new BadRequestException(
          'A product cannot be listed as its own ingredient',
        );
      }
    }

    // 2. No duplicate ingredient rows — prevents silent doubled deduction.
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.ingredientProductId)) {
        throw new BadRequestException(
          `Duplicate ingredient ${item.ingredientProductId} in recipe`,
        );
      }
      seen.add(item.ingredientProductId);
    }

    // 3. All ingredients must exist in this org.
    const ingredientIds = items.map((i) => i.ingredientProductId);
    const products = await this.productRepo.find({
      where: { id: In(ingredientIds), organizationId },
    });
    if (products.length !== ingredientIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = ingredientIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Ingredient products not found: ${missing.join(', ')}`,
      );
    }

    // 4. Ingredients cannot themselves be RECIPE products — enforced to avoid
    //    unbounded recursion at checkout. This deliberately keeps the
    //    inventory engine flat (one level of explosion). If nested recipes
    //    are needed later, this rule is the single place to change.
    const nested = products.find(
      (p) => p.inventoryType === InventoryType.RECIPE,
    );
    if (nested) {
      throw new BadRequestException(
        `Ingredient "${nested.name}" is itself a RECIPE product. Nested recipes are not supported.`,
      );
    }
  }
}
