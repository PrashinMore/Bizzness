import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  businessName?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  businessLogo?: string | null;

  @IsString()
  @IsOptional()
  businessAddress?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  gstNumber?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string | null;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  contactEmail?: string | null;
}

