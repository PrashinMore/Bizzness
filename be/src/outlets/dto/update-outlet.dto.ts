import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateOutletDto } from './create-outlet.dto';

export class UpdateOutletDto extends PartialType(CreateOutletDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

