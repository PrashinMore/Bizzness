import { IsNumber, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class AdjustPointsDto {
  @IsString()
  customerId!: string;

  @IsInt()
  @Min(1)
  points!: number; // Positive for adding, negative for subtracting

  @IsString()
  @IsOptional()
  description?: string;
}

