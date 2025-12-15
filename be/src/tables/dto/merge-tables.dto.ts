import { IsArray, IsUUID } from 'class-validator';

export class MergeTablesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  sourceTableIds: string[];

  @IsUUID()
  targetTableId: string;
}
