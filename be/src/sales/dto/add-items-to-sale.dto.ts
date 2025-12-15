import {
	ArrayMinSize,
	IsArray,
	IsNumber,
	IsPositive,
	IsUUID,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddSaleItemDto {
	@IsUUID()
	productId: string;

	@IsNumber()
	@IsPositive()
	quantity: number;

	@IsNumber()
	@IsPositive()
	sellingPrice: number;
}

export class AddItemsToSaleDto {
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => AddSaleItemDto)
	items: AddSaleItemDto[];
}
