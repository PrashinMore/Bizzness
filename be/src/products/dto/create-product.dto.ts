import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string | null;
}

