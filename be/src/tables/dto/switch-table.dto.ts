import { IsUUID } from 'class-validator';

export class SwitchTableDto {
  @IsUUID()
  toTableId: string;
}
