import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from '../categories/entities/category.entity';

interface ListOptions {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  organizationIds?: string[];
  excludeRawMaterials?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  create(dto: CreateProductDto & { organizationId: string }) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async findAll(options: ListOptions = {}) {
    const qb = this.productRepo.createQueryBuilder('product');

    if (options.organizationIds && options.organizationIds.length > 0) {
      qb.andWhere('product.organizationId IN (:...organizationIds)', {
        organizationIds: options.organizationIds,
      });
    } else if (options.organizationIds && options.organizationIds.length === 0) {
      // User has no organizations, return empty
      qb.andWhere('1 = 0');
    }

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

    // Exclude raw material categories if requested (for menu/checkout)
    if (options.excludeRawMaterials) {
      // Use a subquery to exclude products where category matches any raw material category name
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM categories cat 
          WHERE cat."isRawMaterial" = true 
          AND LOWER(cat.name) = LOWER(product.category)
        )`,
      );
    }

    qb.orderBy('product.updatedAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string, organizationIds?: string[]) {
    const where: any = { id };
    if (organizationIds && organizationIds.length > 0) {
      where.organizationId = In(organizationIds);
    }
    const product = await this.productRepo.findOne({ where });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    // Double check organization access
    if (organizationIds && organizationIds.length > 0 && !organizationIds.includes(product.organizationId)) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async adjustStock(id: string, delta: number, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    const newStock = product.stock + delta;
    product.stock = Math.max(newStock, 0);
    return this.productRepo.save(product);
  }

  async remove(id: string, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    await this.productRepo.remove(product);
  }
}

