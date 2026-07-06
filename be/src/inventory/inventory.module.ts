import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { StockModule } from '../stock/stock.module';
import { InventoryService } from './inventory.service';

/**
 * Thin wiring module. InventoryService is a pure orchestrator over
 * StockService (writes) and RecipesService (reads) — it owns no tables of
 * its own, so no TypeOrmModule.forFeature here.
 */
@Module({
  imports: [StockModule, RecipesModule],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
