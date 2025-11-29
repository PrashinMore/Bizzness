import { Body, Controller, Get, Param, Post, Patch, Query, ParseUUIDPipe, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { type Request } from 'express';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
	constructor(private readonly salesService: SalesService) {}

	private getOrganizationIds(user: SanitizedUser): string[] {
		if (!user.organizations || user.organizations.length === 0) {
			throw new ForbiddenException('You must be assigned to at least one organization');
		}
		return user.organizations.map(org => org.id);
	}

	private getFirstOrganizationId(user: SanitizedUser): string {
		if (!user.organizations || user.organizations.length === 0) {
			throw new ForbiddenException('You must be assigned to at least one organization');
		}
		return user.organizations[0].id;
	}

	@Get()
	findAll(@Req() req: RequestWithUser, @Query() query: ListSalesDto) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.findAll({
			from: query.from,
			to: query.to,
			productId: query.productId,
			staff: query.staff,
			paymentType: query.paymentType,
			organizationIds,
		});
	}

	@Get('totals/daily')
	dailyTotals(@Req() req: RequestWithUser, @Query('from') from?: string, @Query('to') to?: string) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.dailyTotals(from, to, organizationIds);
	}

	@Get('totals/payment-type')
	getPaymentTypeTotals(@Req() req: RequestWithUser, @Query() query: ListSalesDto) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.getPaymentTypeTotals({
			from: query.from,
			to: query.to,
			productId: query.productId,
			staff: query.staff,
			organizationIds,
			// Note: paymentType filter is intentionally excluded
			// so we get totals for both cash and UPI
		});
	}

	@Get(':id')
	findOne(@Req() req: RequestWithUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.findOne(id, organizationIds);
	}

	@Post()
	create(@Req() req: RequestWithUser, @Body() dto: CreateSaleDto) {
		const organizationId = this.getFirstOrganizationId(req.user);
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.create({ ...dto, organizationId }, organizationIds);
	}

	@Patch(':id')
	update(
		@Req() req: RequestWithUser,
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: UpdateSaleDto,
	) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.salesService.update(id, dto, organizationIds);
	}
}


