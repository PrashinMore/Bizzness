import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RecipeItemDto } from './recipe-item.dto';

export class CreateRecipeDto {
  @IsUUID()
  productId!: string;

  /** Optional — null/undefined means "global recipe for this org". */
  @IsUUID()
  @IsOptional()
  outletId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}
