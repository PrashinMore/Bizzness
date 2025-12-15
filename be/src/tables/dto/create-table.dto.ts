import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;
}
