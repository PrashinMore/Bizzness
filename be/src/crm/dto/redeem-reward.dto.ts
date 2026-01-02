import { IsUUID, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class RedeemRewardDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  rewardId!: string;

  @IsNumber()
  @Min(0)
  billAmount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

