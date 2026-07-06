import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryType } from '../entities/product.entity';

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

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsUUID()
  @IsOptional()
  outletId?: string;

  /**
   * Optional — defaults to true in the DB so existing clients that don't send
   * this field get the same behaviour as before.
   */
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  /**
   * Optional — defaults to SIMPLE in the DB. Clients upgrading to the recipe
   * system can pass 'RECIPE' here and then create the recipe via POST /recipes.
   */
  @IsEnum(InventoryType)
  @IsOptional()
  inventoryType?: InventoryType;
}
