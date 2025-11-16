import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

interface ListOptions {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async findAll(options: ListOptions = {}) {
    const qb = this.productRepo.createQueryBuilder('product');

    if (options.category) {
      qb.andWhere('product.category ILIKE :category', {
        category: `%${options.category}%`,
      });
    }

    if (options.search) {
      qb.andWhere('product.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    if (options.lowStockOnly) {
      qb.andWhere('product.stock < product.lowStockThreshold');
    }

    qb.orderBy('product.updatedAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async adjustStock(id: string, delta: number) {
    const product = await this.findOne(id);
    const newStock = product.stock + delta;
    product.stock = Math.max(newStock, 0);
    return this.productRepo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
  }
}

