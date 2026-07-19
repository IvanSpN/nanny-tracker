import { PartialType } from '@nestjs/swagger';
import { CreateWorkSessionDto } from './create-work-session.dto';

export class UpdateWorkSessionDto extends PartialType(CreateWorkSessionDto) {}
