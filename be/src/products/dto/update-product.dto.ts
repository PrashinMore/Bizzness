import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsInt, Min } from 'class-validator';

import { IsOptional, IsString } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsInt()
  @Min(0)
  stock?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string | null;
}

