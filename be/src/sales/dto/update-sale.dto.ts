import {
	IsIn,
	IsOptional,
	IsBoolean,
	IsString,
	IsNumber,
} from 'class-validator';

export class UpdateSaleDto {
	@IsString()
	@IsIn(['cash', 'UPI', 'mixed'])
	@IsOptional()
	paymentType?: string;

	@IsNumber()
	@IsOptional()
	cashAmount?: number;

	@IsNumber()
	@IsOptional()
	upiAmount?: number;

	@IsBoolean()
	@IsOptional()
	isPaid?: boolean;
}

