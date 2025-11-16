import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';

@Controller('expenses')
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Get()
	findAll(@Query() query: ListExpensesDto) {
		return this.expensesService.findAll({
			from: query.from,
			to: query.to,
			category: query.category,
		});
	}

	@Get('summary/monthly')
	monthly(@Query('from') from?: string, @Query('to') to?: string) {
		return this.expensesService.monthlySummary(from, to);
	}

	@Post()
	create(@Body() dto: CreateExpenseDto) {
		return this.expensesService.create(dto);
	}

	@Patch(':id')
	update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateExpenseDto) {
	 return this.expensesService.update(id, dto);
	}

	@Delete(':id')
	remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
		return this.expensesService.remove(id);
	}
}


