import {
	IsIn,
	IsOptional,
	IsBoolean,
	IsString,
} from 'class-validator';

export class UpdateSaleDto {
	@IsString()
	@IsIn(['cash', 'UPI'])
	@IsOptional()
	paymentType?: string;

	@IsBoolean()
	@IsOptional()
	isPaid?: boolean;
}

