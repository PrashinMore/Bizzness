import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { GlobalProduct } from './entities/global-product.entity';
import { StorageService } from './storage.service';
import { Category } from '../categories/entities/category.entity';
import { StockModule } from '../stock/stock.module';
import { OutletsModule } from '../outlets/outlets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, GlobalProduct]),
    StockModule,
    OutletsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, StorageService],
  exports: [ProductsService],
})
export class ProductsModule {}

