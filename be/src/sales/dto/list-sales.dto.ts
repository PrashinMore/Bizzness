import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListSalesDto {
	@IsOptional()
	@IsDateString()
	from?: string;

	@IsOptional()
	@IsDateString()
	to?: string;

	@IsOptional()
	@IsUUID()
	productId?: string;

	@IsOptional()
	@IsString()
	staff?: string;
}


