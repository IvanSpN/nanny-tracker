import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkSessionRateType } from '../models/work-sessions';

export const WORK_SESSION_COMMENT_MAX_LENGTH = 240;

const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class CreateWorkSessionDto {
  @ApiProperty({
    example: '2f1842e6-9568-468c-9d0d-f97eaa51ee59',
    description: 'ID клиента текущего работника',
  })
  @Transform(trimString)
  @IsUUID()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({
    example: '2026-07-13',
    description: 'Дата смены',
  })
  @Transform(trimString)
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsNotEmpty()
  workDate!: string;

  @ApiProperty({
    example: '10:00',
    description: 'Время начала смены',
  })
  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @ApiProperty({
    example: '14:30',
    description: 'Время окончания смены. Окончание раньше начала означает следующий день.',
  })
  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @ApiPropertyOptional({
    enum: WorkSessionRateType,
    enumName: 'WorkSessionRateType',
    example: WorkSessionRateType.WEEKEND,
    description:
      'Переопределение ставки для праздника. Если не передан, backend выберет regular/weekend по дате. Суббота и воскресенье всегда считаются weekend.',
  })
  @IsOptional()
  @IsEnum(WorkSessionRateType)
  rateType?: WorkSessionRateType;

  @ApiPropertyOptional({
    example: 'Вечерняя смена',
    description: 'Комментарий к смене',
    maxLength: WORK_SESSION_COMMENT_MAX_LENGTH,
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(WORK_SESSION_COMMENT_MAX_LENGTH)
  comment?: string | null;
}
