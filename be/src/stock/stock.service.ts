import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { Outlet } from '../outlets/entities/outlet.entity';

/**
 * StockService owns the `stock` table (one row per productId + outletId).
 *
 * Every mutating method accepts an OPTIONAL EntityManager. Callers inside
 * a TypeORM transaction (SalesService.create, addItemsToSale, ...) MUST
 * pass their manager so the stock write participates in the same
 * transaction as the sale insert. Callers outside a transaction (admin
 * adjust, controller endpoints) can keep calling without it — we fall back
 * to the injected repositories, which is exactly the pre-existing
 * behaviour, so this change is strictly additive and backward compatible.
 */
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

  // ---------------------------------------------------------------------------
  // Repository resolution helpers
  // ---------------------------------------------------------------------------

  private stocks(manager?: EntityManager): Repository<Stock> {
    return manager ? manager.getRepository(Stock) : this.stockRepo;
  }

  private products(manager?: EntityManager): Repository<Product> {
    return manager ? manager.getRepository(Product) : this.productRepo;
  }

  private outlets(manager?: EntityManager): Repository<Outlet> {
    return manager ? manager.getRepository(Outlet) : this.outletRepo;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async getStock(
    productId: string,
    outletId: string,
    manager?: EntityManager,
  ): Promise<Stock | null> {
    return this.stocks(manager).findOne({
      where: { productId, outletId },
      relations: ['product', 'outlet'],
    });
  }

  async getOrCreateStock(
    productId: string,
    outletId: string,
    manager?: EntityManager,
  ): Promise<Stock> {
    let stock = await this.stocks(manager).findOne({
      where: { productId, outletId },
    });

    if (!stock) {
      const product = await this.products(manager).findOne({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }

      const outlet = await this.outlets(manager).findOne({
        where: { id: outletId },
      });
      if (!outlet) {
        throw new NotFoundException(`Outlet ${outletId} not found`);
      }

      stock = this.stocks(manager).create({ productId, outletId, quantity: 0 });
      stock = await this.stocks(manager).save(stock);
    }

    return stock;
  }

  /**
   * Batched fetch for checkout hot path. Creates missing rows on the fly so
   * downstream code can treat stock as always-present (0 quantity).
   */
  async getStockForProducts(
    productIds: string[],
    outletId: string,
    manager?: EntityManager,
  ): Promise<Map<string, Stock>> {
    if (productIds.length === 0) return new Map();

    const stocks = await this.stocks(manager).find({
      where: { productId: In(productIds), outletId },
    });

    const stockMap = new Map<string, Stock>();
    stocks.forEach((stock) => stockMap.set(stock.productId, stock));

    for (const productId of productIds) {
      if (!stockMap.has(productId)) {
        const stock = await this.getOrCreateStock(productId, outletId, manager);
        stockMap.set(productId, stock);
      }
    }

    return stockMap;
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Signed delta. Positive = restock, negative = sale/waste. Fails if the
   * resulting quantity would go below zero; callers should pre-validate so
   * errors surface with business context ("Insufficient stock for Paneer")
   * before we ever try to write.
   */
  async adjustStock(
    productId: string,
    outletId: string,
    delta: number,
    manager?: EntityManager,
  ): Promise<Stock> {
    const stock = await this.getOrCreateStock(productId, outletId, manager);
    const newQuantity = stock.quantity + delta;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current stock: ${stock.quantity}, requested adjustment: ${delta}`,
      );
    }

    stock.quantity = newQuantity;
    return this.stocks(manager).save(stock);
  }

  async setStock(
    productId: string,
    outletId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<Stock> {
    if (quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const stock = await this.getOrCreateStock(productId, outletId, manager);
    stock.quantity = quantity;
    return this.stocks(manager).save(stock);
  }

  // ---------------------------------------------------------------------------
  // Dashboard helpers (unchanged behaviour; just now take an optional manager)
  // ---------------------------------------------------------------------------

  async getStockForOutlet(
    outletId: string,
    productIds?: string[],
    manager?: EntityManager,
  ): Promise<Stock[]> {
    const where: any = { outletId };
    if (productIds && productIds.length > 0) {
      where.productId = In(productIds);
    }

    return this.stocks(manager).find({
      where,
      relations: ['product'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getLowStockItems(
    outletId: string,
    organizationId: string,
    manager?: EntityManager,
  ): Promise<Stock[]> {
    const products = await this.products(manager).find({
      where: { organizationId },
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);
    const existingStocks = await this.getStockForOutlet(
      outletId,
      productIds,
      manager,
    );

    const stockMap = new Map<string, Stock>();
    existingStocks.forEach((stock) => stockMap.set(stock.productId, stock));

    const lowStockItems: Stock[] = [];

    for (const product of products) {
      const existingStock = stockMap.get(product.id);
      let stock: Stock;

      if (existingStock) {
        stock = existingStock;
      } else {
        // Treat "no stock row" as 0 so a fresh product is visible in low-stock
        // reports without requiring a prior stock write.
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

      if (stock.quantity < product.lowStockThreshold) {
        if (!existingStock) {
          const createdStock = await this.getOrCreateStock(
            product.id,
            outletId,
            manager,
          );
          const stockWithProduct = await this.stocks(manager).findOne({
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
