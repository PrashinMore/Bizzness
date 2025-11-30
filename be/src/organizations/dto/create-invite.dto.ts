import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class CreateInviteParamsDto {
  @IsUUID('4')
  organizationId!: string;
}

