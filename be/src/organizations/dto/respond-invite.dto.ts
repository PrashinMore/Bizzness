import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RespondInviteDto {
  @IsIn(['accept', 'decline'])
  @IsNotEmpty()
  action!: 'accept' | 'decline';
}

export class RespondInviteByTokenDto {
  @IsUUID('4')
  @IsNotEmpty()
  token!: string;

  @IsIn(['accept', 'decline'])
  @IsNotEmpty()
  action!: 'accept' | 'decline';
}

