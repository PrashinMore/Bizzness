import { IsUUID, IsString, IsOptional } from 'class-validator';

export class RedeemRewardDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  rewardId!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

