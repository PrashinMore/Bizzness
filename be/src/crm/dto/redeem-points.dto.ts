import { IsNumber, IsPositive, IsUUID, Min } from 'class-validator';

export class RedeemPointsDto {
  @IsUUID()
  customerId!: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  pointsToRedeem!: number;

  @IsNumber()
  @IsPositive()
  billAmount!: number;
}

