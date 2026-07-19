import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class FindWorkSessionsQueryDto {
  @ApiPropertyOptional({
    example: '2026-07-13',
    description: 'Начало периода',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-07-19',
    description: 'Конец периода',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
}
