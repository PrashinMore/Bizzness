import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { RecipeUnit } from '../entities/recipe-item.entity';

export class RecipeItemDto {
  @IsUUID()
  @IsNotEmpty()
  ingredientProductId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsEnum(RecipeUnit)
  unit!: RecipeUnit;
}
