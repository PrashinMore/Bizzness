import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateInventorySettingsDto {
  @IsInt()
  @IsOptional()
  @Min(0)
  defaultLowStockThreshold?: number;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  defaultUnit?: string;

  @IsBoolean()
  @IsOptional()
  stockWarningAlerts?: boolean;
}

