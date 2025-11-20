import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class UpdateBillingSettingsDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  invoicePrefix?: string;

  @IsString()
  @IsOptional()
  invoiceFooter?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @IsEnum(DiscountType)
  @IsOptional()
  defaultDiscountType?: DiscountType;
}

