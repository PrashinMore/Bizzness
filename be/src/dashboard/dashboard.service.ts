import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async getTodaySummary(organizationIds: string[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sales, expenses, saleItems] = await Promise.all([
      this.saleRepo.find({
        where: {
          date: Between(today, tomorrow),
          organizationId: In(organizationIds),
        },
      }),
      this.expenseRepo.find({
        where: {
          date: Between(today, tomorrow),
          organizationId: In(organizationIds),
        },
      }),
      this.saleItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.sale', 'sale')
        .innerJoin('product', 'product', 'product.id = item.productId')
        .select('item.quantity', 'quantity')
        .addSelect('product.costPrice', 'costPrice')
        .where('sale.date >= :startDate AND sale.date < :endDate', {
          startDate: today,
          endDate: tomorrow,
        })
        .andWhere('sale.organizationId IN (:...organizationIds)', {
          organizationIds,
        })
        .getRawMany(),
    ]);

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    // Calculate Cost of Goods Sold (COGS)
    const costOfGoodsSold = saleItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.costPrice),
      0,
    );

    // Gross Profit = Sales - COGS
    const grossProfit = totalSales - costOfGoodsSold;
    
    // Net Profit = Gross Profit - Operating Expenses
    const netProfit = grossProfit - totalExpenses;
    const totalOrders = sales.length;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      costOfGoodsSold: Number(costOfGoodsSold.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      totalOrders,
    };
  }

  async getSalesTrend(range: '7days' | '30days' = '7days', organizationIds: string[]) {
    const days = range === '7days' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await this.saleRepo
      .createQueryBuilder('sale')
      .select("DATE_TRUNC('day', sale.date)", 'date')
      .addSelect('SUM(sale.totalAmount)', 'totalSales')
      .where('sale.date >= :startDate AND sale.organizationId IN (:...organizationIds)', { 
        startDate,
        organizationIds,
      })
      .groupBy("DATE_TRUNC('day', sale.date)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return sales.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      totalSales: Number(parseFloat(s.totalSales || '0').toFixed(2)),
    }));
  }

  async getTopProducts(limit: number = 5, organizationIds: string[]) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const topProducts = await this.saleItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.sale', 'sale')
      .select('item.productId', 'productId')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .where('sale.date >= :startDate AND sale.organizationId IN (:...organizationIds)', { 
        startDate,
        organizationIds,
      })
      .groupBy('item.productId')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.productRepo.find({
      where: { 
        id: In(productIds),
        organizationId: In(organizationIds),
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((tp) => {
      const product = productMap.get(tp.productId);
      return {
        productId: tp.productId,
        productName: product?.name || 'Unknown Product',
        totalQuantity: parseInt(tp.totalQuantity || '0', 10),
        totalRevenue: Number(parseFloat(tp.totalRevenue || '0').toFixed(2)),
      };
    });
  }

  async getLowStockAlerts(organizationIds: string[]) {
    const products = await this.productRepo.find({
      where: { organizationId: In(organizationIds) },
    });
    return products
      .filter((p) => p.stock < p.lowStockThreshold)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        unit: p.unit,
        imageUrl: p.imageUrl,
      }))
      .sort((a, b) => a.stock - b.stock); // Sort by stock (lowest first)
  }

  async getExpensesSummary(organizationIds: string[]) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month

    const expenses = await this.expenseRepo.find({
      where: {
        date: Between(startDate, new Date()),
        organizationId: In(organizationIds),
      },
    });

    const categoryTotals = new Map<string, number>();
    let total = 0;

    expenses.forEach((expense) => {
      const category = expense.category || 'Uncategorized';
      const amount = Number(expense.amount);
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
      total += amount;
    });

    const summary = Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
      percentage: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
    }));

    return summary.sort((a, b) => b.amount - a.amount);
  }
}

