import { IsInt } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  delta: number;
}
