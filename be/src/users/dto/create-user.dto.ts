import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import type { UserRole } from '../user-role.type';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  role?: UserRole;
}

