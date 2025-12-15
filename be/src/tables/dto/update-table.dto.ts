import { IsInt, IsOptional, IsString, MaxLength, Min, IsBoolean } from 'class-validator';

export class UpdateTableDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
