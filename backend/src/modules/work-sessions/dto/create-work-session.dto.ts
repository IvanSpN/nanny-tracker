import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkSessionRateType } from '../models/work-sessions';

export const WORK_SESSION_COMMENT_MAX_LENGTH = 240;
export const WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH = 120;
export const WORK_SESSION_EXPENSES_MAX_COUNT = 20;

const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class WorkSessionExpenseDto {
  @ApiProperty({
    example: '300.00',
    description: 'Сумма расхода',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? value.toString() : trimString({ value }),
  )
  @IsString()
  @Matches(/^(?!0+(\.0{1,2})?$)\d+(\.\d{1,2})?$/, {
    message: 'Сумма расхода должна быть больше нуля, не больше 2 знаков после точки',
  })
  amount!: string;

  @ApiProperty({
    example: 'Вода',
    description: 'За что потрачено',
    maxLength: WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Укажите, за что расход' })
  @MaxLength(WORK_SESSION_EXPENSE_DESCRIPTION_MAX_LENGTH)
  description!: string;
}

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

  @ApiPropertyOptional({
    type: [WorkSessionExpenseDto],
    description:
      'Доп. расходы няни за смену (вода, площадка и т.п.). Прибавляются к сумме смены. Передаётся полным списком.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORK_SESSION_EXPENSES_MAX_COUNT)
  @ValidateNested({ each: true })
  @Type(() => WorkSessionExpenseDto)
  expenses?: WorkSessionExpenseDto[];
}
