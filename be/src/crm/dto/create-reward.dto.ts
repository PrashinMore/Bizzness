import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export enum RewardType {
  DISCOUNT_PERCENTAGE = 'DISCOUNT_PERCENTAGE',
  DISCOUNT_FIXED = 'DISCOUNT_FIXED',
  FREE_ITEM = 'FREE_ITEM',
  CASHBACK = 'CASHBACK',
}

export class CreateRewardDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RewardType)
  type!: RewardType;

  @IsInt()
  @Min(1)
  pointsRequired!: number;

  @ValidateIf((o) => o.type === RewardType.DISCOUNT_PERCENTAGE)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ValidateIf((o) => o.type === RewardType.DISCOUNT_FIXED)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ValidateIf((o) => o.type === RewardType.FREE_ITEM)
  @IsString()
  @IsOptional()
  freeItemName?: string;

  @ValidateIf((o) => o.type === RewardType.CASHBACK)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cashbackAmount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number;
}

