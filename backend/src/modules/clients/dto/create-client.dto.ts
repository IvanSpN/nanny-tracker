import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimValue = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString().trim();
  }

  return value;
};

export class SpecialDayDto {
  @ApiProperty({
    example: 2,
    description: 'День недели по ISO: 1 — понедельник, 7 — воскресенье',
    minimum: 1,
    maximum: 7,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @ApiProperty({
    example: '4000.00',
    description: 'Ставка за час в этот день недели',
  })
  @Transform(trimValue)
  @IsNotEmpty()
  @IsDecimal({
    decimal_digits: '0,2',
  })
  rate!: string;
}

export class CreateClientDto {
  @ApiProperty({
    example: 'Анна Петрова',
    description: 'Имя клиента',
  })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: '1500.00',
    description: 'Обычная ставка клиента',
  })
  @Transform(trimValue)
  @IsNotEmpty()
  @IsDecimal({
    decimal_digits: '0,2',
  })
  regularRate!: string;

  @ApiPropertyOptional({
    example: '2000.00',
    description: 'Ставка клиента за выходной день',
    nullable: true,
  })
  @Transform(trimValue)
  @IsOptional()
  @IsDecimal({
    decimal_digits: '0,2',
  })
  weekendRate?: string | null;

  @ApiPropertyOptional({
    type: [SpecialDayDto],
    description:
      'Особые дни недели со своей ставкой. Приоритетнее обычной, выходной и праздничной ставки. Передаётся полным списком.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => SpecialDayDto)
  specialDays?: SpecialDayDto[];

  @ApiPropertyOptional({
    example: '+7 777 123 45 67',
    description: 'Телефон клиента',
    nullable: true,
  })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'Предпочитает оплату по пятницам',
    description: 'Заметки по клиенту',
    nullable: true,
  })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  notes?: string | null;
}
