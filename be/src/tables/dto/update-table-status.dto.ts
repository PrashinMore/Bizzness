import { IsEnum } from 'class-validator';
import { TableStatus } from '../entities/dining-table.entity';

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;
}
