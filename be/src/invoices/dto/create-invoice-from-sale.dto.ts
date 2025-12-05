import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateInvoiceFromSaleDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsOptional()
  @IsBoolean()
  forceSyncPdf?: boolean;
}

