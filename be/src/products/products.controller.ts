import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.productsService.findAll({
      search,
      category,
      lowStockOnly: lowStock === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/stock')
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.productsService.adjustStock(id, dto.delta);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

