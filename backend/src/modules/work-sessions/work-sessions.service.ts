import { Injectable } from '@nestjs/common';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { UpdateWorkSessionDto } from './dto/update-work-session.dto';

@Injectable()
export class WorkSessionsService {
  create(_createWorkSessionDto: CreateWorkSessionDto) {
    return 'This action adds a new workSession';
  }

  findAll() {
    return `This action returns all workSessions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workSession`;
  }

  update(id: number, _updateWorkSessionDto: UpdateWorkSessionDto) {
    return `This action updates a #${id} workSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} workSession`;
  }
}
