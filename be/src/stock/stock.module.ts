import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { Outlet } from '../outlets/entities/outlet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Product, Outlet])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}

