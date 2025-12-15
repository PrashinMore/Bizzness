import { IsUUID } from 'class-validator';

export class AssignTableDto {
  @IsUUID()
  tableId: string;
}
