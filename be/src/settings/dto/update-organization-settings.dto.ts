import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableCRM?: boolean;

  @IsOptional()
  @IsBoolean()
  enableLoyalty?: boolean;
}

