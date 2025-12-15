import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { DiningTable } from '../tables/entities/dining-table.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Sale, SaleItem, DiningTable]),
		forwardRef(() => SettingsModule),
	],
	controllers: [SalesController],
	providers: [SalesService],
	exports: [SalesService],
})
export class SalesModule {}


