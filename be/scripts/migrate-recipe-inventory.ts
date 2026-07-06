/**
 * Idempotent migration for the recipe-based inventory upgrade.
 *
 * TypeORM `synchronize: true` (see app.module.ts) will create the new
 * columns / tables on next boot automatically, but:
 *   1. It can't backfill data (e.g. defaulting every existing Product to
 *      inventoryType = 'SIMPLE' at a safe moment).
 *   2. In production it's safer to apply DDL from a reviewed script than
 *      to rely on synchronize racing with traffic.
 *
 * This script is safe to re-run. Each statement uses IF NOT EXISTS /
 * ON CONFLICT so partial runs converge to the same end state.
 *
 * Usage:
 *   npm run migrate:recipe-inventory
 */
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

async function migrate() {
  ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' });
  const cfg = new ConfigService();

  const dataSource = new DataSource({
    type: 'postgres',
    host: cfg.get<string>('DB_HOST') ?? cfg.get<string>('DBHOST') ?? 'localhost',
    port: parseInt(cfg.get<string>('DB_PORT') ?? '5432', 10),
    username: cfg.get<string>('DB_USER') ?? 'postgres',
    password: cfg.get<string>('DB_PASSWORD') ?? 'postgres',
    database: cfg.get<string>('DB_NAME') ?? 'biznes',
    entities: [], // raw SQL
  });

  await dataSource.initialize();
  console.log('✅ Connected to database');

  try {
    await dataSource.transaction(async (manager) => {
      // -------------------------------------------------------------------
      // 1. product: add trackInventory + inventoryType with safe defaults
      // -------------------------------------------------------------------
      await manager.query(`
        ALTER TABLE "product"
        ADD COLUMN IF NOT EXISTS "trackInventory" boolean NOT NULL DEFAULT true
      `);

      await manager.query(`
        ALTER TABLE "product"
        ADD COLUMN IF NOT EXISTS "inventoryType" varchar(16) NOT NULL DEFAULT 'SIMPLE'
      `);

      // Defensive backfill: any pre-existing NULLs (possible if the column
      // existed without a default at some point) converge to SIMPLE.
      await manager.query(`
        UPDATE "product"
        SET "inventoryType" = 'SIMPLE'
        WHERE "inventoryType" IS NULL
      `);

      // Cheap lookup when resolving recipes in hot paths.
      await manager.query(`
        CREATE INDEX IF NOT EXISTS "idx_product_inventory_type"
        ON "product" ("inventoryType")
      `);

      // -------------------------------------------------------------------
      // 2. recipe table
      // -------------------------------------------------------------------
      await manager.query(`
        CREATE TABLE IF NOT EXISTS "recipe" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "productId" uuid NOT NULL,
          "organizationId" uuid NOT NULL,
          "outletId" uuid NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "fk_recipe_product"
            FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE,
          CONSTRAINT "fk_recipe_org"
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE,
          CONSTRAINT "fk_recipe_outlet"
            FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE CASCADE
        )
      `);

      // Uniqueness: one recipe per (product, outlet). NULL outletId = global.
      // Postgres treats NULLs as distinct by default so we need a partial
      // unique index to guarantee only ONE global recipe per product.
      await manager.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uq_recipe_product_outlet"
        ON "recipe" ("productId", "outletId")
        WHERE "outletId" IS NOT NULL
      `);

      await manager.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uq_recipe_product_global"
        ON "recipe" ("productId")
        WHERE "outletId" IS NULL
      `);

      await manager.query(`
        CREATE INDEX IF NOT EXISTS "idx_recipe_org"
        ON "recipe" ("organizationId")
      `);

      // -------------------------------------------------------------------
      // 3. recipe_item table
      // -------------------------------------------------------------------
      await manager.query(`
        CREATE TABLE IF NOT EXISTS "recipe_item" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "recipeId" uuid NOT NULL,
          "ingredientProductId" uuid NOT NULL,
          "quantity" numeric(12,3) NOT NULL,
          "unit" varchar(8) NOT NULL,
          CONSTRAINT "fk_recipe_item_recipe"
            FOREIGN KEY ("recipeId") REFERENCES "recipe"("id") ON DELETE CASCADE,
          CONSTRAINT "fk_recipe_item_product"
            FOREIGN KEY ("ingredientProductId") REFERENCES "product"("id") ON DELETE RESTRICT,
          CONSTRAINT "chk_recipe_item_unit"
            CHECK ("unit" IN ('g','kg','ml','l','pcs')),
          CONSTRAINT "chk_recipe_item_qty_positive"
            CHECK ("quantity" > 0)
        )
      `);

      await manager.query(`
        CREATE INDEX IF NOT EXISTS "idx_recipe_item_recipe"
        ON "recipe_item" ("recipeId")
      `);

      await manager.query(`
        CREATE INDEX IF NOT EXISTS "idx_recipe_item_ingredient"
        ON "recipe_item" ("ingredientProductId")
      `);
    });

    console.log('✅ Recipe inventory migration applied');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
