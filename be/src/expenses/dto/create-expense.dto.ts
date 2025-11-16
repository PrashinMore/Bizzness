import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	category: string;

	@IsNumber()
	amount: number;

	@IsOptional()
	@IsString()
	note?: string;

	@IsDateString()
	date: string;

	@IsString()
	@IsNotEmpty()
	addedBy: string; // userId
}


