import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('export') exportType?: string,
  ) {
    if (exportType === 'csv') {
      const csv = await this.reportsService.exportSalesReportCSV(from, to);
      const filename = `sales-report-${from || 'all'}-${to || 'all'}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return csv;
    }
    return this.reportsService.getSalesReport(from, to);
  }

  @Get('profit-loss')
  getProfitLossReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getProfitLossReport(from, to);
  }

  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('expenses')
  getExpenseReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getExpenseReport(from, to);
  }
}

