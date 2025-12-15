import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTableSettingsDto {
  @IsBoolean()
  @IsOptional()
  enableTables?: boolean;

  @IsBoolean()
  @IsOptional()
  enableReservations?: boolean;

  @IsBoolean()
  @IsOptional()
  allowTableMerge?: boolean;

  @IsBoolean()
  @IsOptional()
  autoFreeTableOnPayment?: boolean;
}
