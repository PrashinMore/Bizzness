import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getSalesReport(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const sales = await this.saleRepo.find({
      where: {
        date: Between(startDate, endDate),
      },
      relations: ['items'],
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalOrders = sales.length;

    // Product-wise breakdown
    const productBreakdown = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productBreakdown.get(item.productId) || {
          name: 'Unknown',
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.subtotal);
        productBreakdown.set(item.productId, existing);
      }
    }

    // Get product names
    const productIds = Array.from(productBreakdown.keys());
    if (productIds.length > 0) {
      const products = await this.productRepo.find({
        where: { id: In(productIds) },
      });
      const productMap = new Map(products.map((p) => [p.id, p.name]));
      for (const [productId, data] of productBreakdown.entries()) {
        data.name = productMap.get(productId) || 'Unknown Product';
      }
    }

    // Staff-wise breakdown
    const staffBreakdown = new Map<string, { name: string; sales: number; orders: number }>();
    for (const sale of sales) {
      const existing = staffBreakdown.get(sale.soldBy) || {
        name: 'Unknown',
        sales: 0,
        orders: 0,
      };
      existing.sales += Number(sale.totalAmount);
      existing.orders += 1;
      staffBreakdown.set(sale.soldBy, existing);
    }

    // Get user names
    const userIds = Array.from(staffBreakdown.keys());
    if (userIds.length > 0) {
      const users = await this.userRepo.find({
        where: { id: In(userIds) },
      });
      const userMap = new Map(users.map((u) => [u.id, u.name]));
      for (const [userId, data] of staffBreakdown.entries()) {
        data.name = userMap.get(userId) || 'Unknown User';
      }
    }

    return {
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalOrders,
        averageOrderValue: totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0,
      },
      productBreakdown: Array.from(productBreakdown.values()).sort(
        (a, b) => b.revenue - a.revenue,
      ),
      staffBreakdown: Array.from(staffBreakdown.values()).sort((a, b) => b.sales - a.sales),
    };
  }

  async getProfitLossReport(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const [sales, expenses, saleItems] = await Promise.all([
      this.saleRepo.find({
        where: {
          date: Between(startDate, endDate),
        },
      }),
      this.expenseRepo.find({
        where: {
          date: Between(startDate, endDate),
        },
      }),
      this.saleItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.sale', 'sale')
        .innerJoin('product', 'product', 'product.id = item.productId')
        .select('item.quantity', 'quantity')
        .addSelect('product.costPrice', 'costPrice')
        .where('sale.date >= :startDate AND sale.date <= :endDate', {
          startDate,
          endDate,
        })
        .getRawMany(),
    ]);

    const revenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const costOfGoodsSold = saleItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.costPrice),
      0,
    );
    const operatingExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const grossProfit = revenue - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses;

    return {
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      revenue: Number(revenue.toFixed(2)),
      costOfGoodsSold: Number(costOfGoodsSold.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      operatingExpenses: Number(operatingExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      grossMargin: revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0,
      netMargin: revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0,
    };
  }

  async getInventoryReport() {
    const products = await this.productRepo.find();

    const inventoryValue = products.reduce(
      (sum, p) => sum + p.stock * Number(p.costPrice),
      0,
    );

    // Calculate sales for last 30 days to determine fast/slow moving
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentSales = await this.saleItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.sale', 'sale')
      .select('item.productId', 'productId')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .where('sale.date >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('item.productId')
      .getRawMany();

    const salesMap = new Map(
      recentSales.map((s) => [s.productId, Number(s.totalQuantity || 0)]),
    );

    const productsWithSales = products.map((p) => {
      const salesQuantity = salesMap.get(p.id) || 0;
      const stockValue = p.stock * Number(p.costPrice);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        unit: p.unit,
        costPrice: Number(p.costPrice),
        stockValue: Number(stockValue.toFixed(2)),
        salesLast30Days: salesQuantity,
        movement: salesQuantity > 10 ? 'fast' : salesQuantity > 0 ? 'medium' : 'slow',
      };
    });

    return {
      summary: {
        totalProducts: products.length,
        totalStockValue: Number(inventoryValue.toFixed(2)),
        lowStockItems: products.filter((p) => p.stock < p.lowStockThreshold).length,
      },
      products: productsWithSales.sort((a, b) => b.stockValue - a.stockValue),
    };
  }

  async getExpenseReport(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const expenses = await this.expenseRepo.find({
      where: {
        date: Between(startDate, endDate),
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Category breakdown
    const categoryBreakdown = new Map<string, number>();
    for (const expense of expenses) {
      const category = expense.category || 'Uncategorized';
      categoryBreakdown.set(
        category,
        (categoryBreakdown.get(category) || 0) + Number(expense.amount),
      );
    }

    // Monthly summary
    const monthlyBreakdown = new Map<string, number>();
    for (const expense of expenses) {
      const monthKey = expense.date.toISOString().substring(0, 7); // YYYY-MM
      monthlyBreakdown.set(
        monthKey,
        (monthlyBreakdown.get(monthKey) || 0) + Number(expense.amount),
      );
    }

    return {
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalTransactions: expenses.length,
        averageExpense: expenses.length > 0 ? Number((totalExpenses / expenses.length).toFixed(2)) : 0,
      },
      categoryBreakdown: Array.from(categoryBreakdown.entries())
        .map(([category, amount]) => ({
          category,
          amount: Number(amount.toFixed(2)),
          percentage: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
      monthlyBreakdown: Array.from(monthlyBreakdown.entries())
        .map(([month, amount]) => ({
          month,
          amount: Number(amount.toFixed(2)),
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  async exportSalesReportCSV(from?: string, to?: string): Promise<string> {
    const report = await this.getSalesReport(from, to);
    const lines: string[] = [];

    // Header
    lines.push('Sales Report');
    lines.push(`Period: ${report.period.from} to ${report.period.to}`);
    lines.push('');

    // Summary
    lines.push('Summary');
    lines.push(`Total Sales,${report.summary.totalSales}`);
    lines.push(`Total Orders,${report.summary.totalOrders}`);
    lines.push(`Average Order Value,${report.summary.averageOrderValue}`);
    lines.push('');

    // Product Breakdown
    lines.push('Product Breakdown');
    lines.push('Product Name,Quantity Sold,Revenue');
    for (const product of report.productBreakdown) {
      lines.push(`${product.name},${product.quantity},${product.revenue}`);
    }
    lines.push('');

    // Staff Breakdown
    lines.push('Staff Breakdown');
    lines.push('Staff Name,Sales,Orders');
    for (const staff of report.staffBreakdown) {
      lines.push(`${staff.name},${staff.sales},${staff.orders}`);
    }

    return lines.join('\n');
  }
}

