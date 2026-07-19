import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkSessionStatus } from '../models/work-sessions';

export class UpdateWorkSessionStatusDto {
  @ApiProperty({
    enum: WorkSessionStatus,
    enumName: 'WorkSessionStatus',
    example: WorkSessionStatus.CONFIRMED,
    description: 'Новый статус смены',
  })
  @IsEnum(WorkSessionStatus)
  status!: WorkSessionStatus;
}
