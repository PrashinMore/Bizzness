import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  unit: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;
}

