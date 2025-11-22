import { Body, Controller, Get, Param, Post, Query, ParseUUIDPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';

@Controller('sales')
export class SalesController {
	constructor(private readonly salesService: SalesService) {}

	@Get()
	findAll(@Query() query: ListSalesDto) {
		return this.salesService.findAll({
			from: query.from,
			to: query.to,
			productId: query.productId,
			staff: query.staff,
			paymentType: query.paymentType,
		});
	}

	@Get('totals/daily')
	dailyTotals(@Query('from') from?: string, @Query('to') to?: string) {
		return this.salesService.dailyTotals(from, to);
	}

	@Get('totals/payment-type')
	getPaymentTypeTotals(@Query() query: ListSalesDto) {
		return this.salesService.getPaymentTypeTotals({
			from: query.from,
			to: query.to,
			productId: query.productId,
			staff: query.staff,
			// Note: paymentType filter is intentionally excluded
			// so we get totals for both cash and UPI
		});
	}

	@Get(':id')
	findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
		return this.salesService.findOne(id);
	}

	@Post()
	create(@Body() dto: CreateSaleDto) {
		return this.salesService.create(dto);
	}
}


