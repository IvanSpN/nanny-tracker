import { Transform } from 'class-transformer';
import { IsDecimal, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
