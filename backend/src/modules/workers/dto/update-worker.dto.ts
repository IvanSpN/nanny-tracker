import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const trimValue = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class UpdateWorkerDto {
  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя работника',
  })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  name!: string;
}
