import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { type Request } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

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
	findAll(@Req() req: RequestWithUser, @Query() query: ListExpensesDto) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.expensesService.findAll({
			from: query.from,
			to: query.to,
			category: query.category,
			organizationIds,
		});
	}

	@Get('summary/monthly')
	monthly(@Req() req: RequestWithUser, @Query('from') from?: string, @Query('to') to?: string) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.expensesService.monthlySummary(from, to, organizationIds);
	}

	@Post()
	create(@Req() req: RequestWithUser, @Body() dto: CreateExpenseDto) {
		const organizationId = this.getFirstOrganizationId(req.user);
		return this.expensesService.create({ ...dto, organizationId });
	}

	@Patch(':id')
	update(@Req() req: RequestWithUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateExpenseDto) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.expensesService.update(id, dto, organizationIds);
	}

	@Delete(':id')
	remove(@Req() req: RequestWithUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
		const organizationIds = this.getOrganizationIds(req.user);
		return this.expensesService.remove(id, organizationIds);
	}
}


