import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getTodaySummary() {
    return this.dashboardService.getTodaySummary();
  }

  @Get('sales-trend')
  getSalesTrend(@Query('range') range?: '7days' | '30days') {
    return this.dashboardService.getSalesTrend(range || '7days');
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit?: string) {
    return this.dashboardService.getTopProducts(
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('low-stock')
  getLowStockAlerts() {
    return this.dashboardService.getLowStockAlerts();
  }

  @Get('expenses-summary')
  getExpensesSummary() {
    return this.dashboardService.getExpensesSummary();
  }
}

