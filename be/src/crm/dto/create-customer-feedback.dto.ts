import { IsInt, IsOptional, IsString, IsEnum, Min, Max } from 'class-validator';

export class CreateCustomerFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}

