import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RecipeItemDto } from './recipe-item.dto';

/**
 * PATCH payload. Supplying `items` REPLACES the recipe item list as a whole.
 * We deliberately do not support per-item patches — a recipe is small and
 * mutations are almost always "edit the dish definition", which is cleaner
 * as a full replacement than as a diff.
 */
export class UpdateRecipeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  @IsOptional()
  items?: RecipeItemDto[];
}
