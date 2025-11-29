import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsDateString,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSaleItemDto {
	@IsUUID()
	productId: string;

	@IsNumber()
	@IsPositive()
	quantity: number;

	@IsNumber()
	@IsPositive()
	sellingPrice: number;
}

export class CreateSaleDto {
	@IsDateString()
	date: string;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateSaleItemDto)
	items: CreateSaleItemDto[];

	@IsNumber()
	@IsPositive()
	totalAmount: number;

	@IsString()
	@IsNotEmpty()
	soldBy: string;

	@IsString()
	@IsIn(['cash', 'UPI'])
	@IsOptional()
	paymentType?: string;

	@IsBoolean()
	@IsOptional()
	isPaid?: boolean;
}


