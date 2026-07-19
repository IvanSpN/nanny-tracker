import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkSessionRateType } from '../models/work-sessions';

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
    example: 4.5,
    description: 'Количество часов в смене',
    minimum: 0.25,
    maximum: 24,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.25)
  @Max(24)
  hours!: number;

  @ApiPropertyOptional({
    enum: WorkSessionRateType,
    enumName: 'WorkSessionRateType',
    example: WorkSessionRateType.REGULAR,
    description: 'Тип ставки. Если не передан, backend выберет regular/weekend по дате.',
  })
  @IsOptional()
  @IsEnum(WorkSessionRateType)
  rateType?: WorkSessionRateType;

  @ApiPropertyOptional({
    example: 'Вечерняя смена',
    description: 'Комментарий к смене',
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  comment?: string | null;
}
