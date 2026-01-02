import { IsOptional, IsEnum } from 'class-validator';

export class UpdateCustomerFeedbackDto {
  @IsOptional()
  @IsEnum(['OPEN', 'RESOLVED'])
  status?: 'OPEN' | 'RESOLVED';
}

