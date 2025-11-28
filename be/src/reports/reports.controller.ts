import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getOrganizationIds(user: SanitizedUser): string[] {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations.map(org => org.id);
  }

  @Get('sales')
  async getSalesReport(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('export') exportType?: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    if (exportType === 'csv') {
      const csv = await this.reportsService.exportSalesReportCSV(from, to, organizationIds);
      const filename = `sales-report-${from || 'all'}-${to || 'all'}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return csv;
    }
    return this.reportsService.getSalesReport(from, to, organizationIds);
  }

  @Get('profit-loss')
  getProfitLossReport(@Req() req: RequestWithUser, @Query('from') from?: string, @Query('to') to?: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.reportsService.getProfitLossReport(from, to, organizationIds);
  }

  @Get('inventory')
  getInventoryReport(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.reportsService.getInventoryReport(organizationIds);
  }

  @Get('expenses')
  getExpenseReport(@Req() req: RequestWithUser, @Query('from') from?: string, @Query('to') to?: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.reportsService.getExpenseReport(from, to, organizationIds);
  }
}

