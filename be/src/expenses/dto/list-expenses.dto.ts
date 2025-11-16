import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListExpensesDto {
	@IsOptional()
	@IsDateString()
	from?: string;

	@IsOptional()
	@IsDateString()
	to?: string;

	@IsOptional()
	@IsString()
	category?: string;
}


