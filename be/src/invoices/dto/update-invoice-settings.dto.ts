import {
  IsOptional,
  IsBoolean,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateInvoiceSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableInvoices?: boolean;

  @IsOptional()
  @IsBoolean()
  gstEnabled?: boolean;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsBoolean()
  invoiceBranchPrefix?: boolean;

  @IsOptional()
  @IsIn(['never', 'monthly', 'yearly'])
  invoiceResetCycle?: 'never' | 'monthly' | 'yearly';

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  invoicePadding?: number;

  @IsOptional()
  @IsIn(['A4', 'thermal'])
  invoiceDisplayFormat?: 'A4' | 'thermal';

  @IsOptional()
  @IsBoolean()
  includeLogo?: boolean;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}

