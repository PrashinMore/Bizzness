import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { Outlet } from '../outlets/entities/outlet.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Outlet)
    private readonly outletRepo: Repository<Outlet>,
  ) {}

  async getStock(productId: string, outletId: string): Promise<Stock | null> {
    return this.stockRepo.findOne({
      where: { productId, outletId },
      relations: ['product', 'outlet'],
    });
  }

  async getOrCreateStock(productId: string, outletId: string): Promise<Stock> {
    let stock = await this.getStock(productId, outletId);
    
    if (!stock) {
      // Verify product and outlet exist
      const product = await this.productRepo.findOne({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }

      const outlet = await this.outletRepo.findOne({ where: { id: outletId } });
      if (!outlet) {
        throw new NotFoundException(`Outlet ${outletId} not found`);
      }

      // Create stock with 0 quantity
      stock = this.stockRepo.create({
        productId,
        outletId,
        quantity: 0,
      });
      stock = await this.stockRepo.save(stock);
    }

    return stock;
  }

  async getStockForProducts(productIds: string[], outletId: string): Promise<Map<string, Stock>> {
    const stocks = await this.stockRepo.find({
      where: {
        productId: In(productIds),
        outletId,
      },
    });

    const stockMap = new Map<string, Stock>();
    stocks.forEach((stock) => {
      stockMap.set(stock.productId, stock);
    });

    // Create missing stock entries with 0 quantity
    for (const productId of productIds) {
      if (!stockMap.has(productId)) {
        const stock = await this.getOrCreateStock(productId, outletId);
        stockMap.set(productId, stock);
      }
    }

    return stockMap;
  }

  async adjustStock(productId: string, outletId: string, delta: number): Promise<Stock> {
    const stock = await this.getOrCreateStock(productId, outletId);
    const newQuantity = stock.quantity + delta;
    
    if (newQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current stock: ${stock.quantity}, requested adjustment: ${delta}`,
      );
    }

    stock.quantity = newQuantity;
    return this.stockRepo.save(stock);
  }

  async setStock(productId: string, outletId: string, quantity: number): Promise<Stock> {
    if (quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const stock = await this.getOrCreateStock(productId, outletId);
    stock.quantity = quantity;
    return this.stockRepo.save(stock);
  }

  async getStockForOutlet(outletId: string, productIds?: string[]): Promise<Stock[]> {
    const where: any = { outletId };
    if (productIds && productIds.length > 0) {
      where.productId = In(productIds);
    }

    return this.stockRepo.find({
      where,
      relations: ['product'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getLowStockItems(outletId: string, organizationId: string): Promise<Stock[]> {
    // Get all products for the organization
    const products = await this.productRepo.find({
      where: { organizationId },
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);
    const existingStocks = await this.getStockForOutlet(outletId, productIds);
    
    // Create a map of existing stocks by productId
    const stockMap = new Map<string, Stock>();
    existingStocks.forEach((stock) => {
      stockMap.set(stock.productId, stock);
    });

    // Check all products for low stock
    // Products without stock entries are considered to have 0 stock
    const lowStockItems: Stock[] = [];
    
    for (const product of products) {
      const existingStock = stockMap.get(product.id);
      let stock: Stock;
      
      if (existingStock) {
        stock = existingStock;
      } else {
        // Product has no stock entry, treat as 0 stock
        // Create a temporary stock object for comparison
        stock = {
          id: '',
          productId: product.id,
          outletId: outletId,
          quantity: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: product,
        } as Stock;
      }
      
      // Check if stock is below threshold
      if (stock.quantity < product.lowStockThreshold) {
        // If stock doesn't exist, get or create it so we return a proper Stock entity
        if (!existingStock) {
          const createdStock = await this.getOrCreateStock(product.id, outletId);
          // Reload with product relation
          const stockWithProduct = await this.stockRepo.findOne({
            where: { id: createdStock.id },
            relations: ['product'],
          });
          if (stockWithProduct) {
            lowStockItems.push(stockWithProduct);
          }
        } else {
          lowStockItems.push(stock);
        }
      }
    }

    return lowStockItems;
  }
}

