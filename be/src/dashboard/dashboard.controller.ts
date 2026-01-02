import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { type Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private getOrganizationIds(user: SanitizedUser): string[] {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations.map(org => org.id);
  }

  @Get('summary')
  getTodaySummary(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.dashboardService.getTodaySummary(organizationIds);
  }

  @Get('sales-trend')
  getSalesTrend(@Req() req: RequestWithUser, @Query('range') range?: '7days' | '30days') {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.dashboardService.getSalesTrend(range || '7days', organizationIds);
  }

  @Get('top-products')
  getTopProducts(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.dashboardService.getTopProducts(
      limit ? parseInt(limit, 10) : 5,
      organizationIds,
    );
  }

  @Get('low-stock')
  getLowStockAlerts(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    const outletId = (req.headers['x-outlet-id'] as string);
    if (!outletId) {
      throw new ForbiddenException('Outlet ID is required. Please select an outlet.');
    }
    return this.dashboardService.getLowStockAlerts(organizationIds, outletId);
  }

  @Get('expenses-summary')
  getExpensesSummary(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.dashboardService.getExpensesSummary(organizationIds);
  }
}

