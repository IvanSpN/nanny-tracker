import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsController } from './work-sessions.controller';
import { WorkSession } from './models/work-sessions';
import { Client } from '../clients/models/client.model';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [SequelizeModule.forFeature([WorkSession, Client]), WorkersModule],
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService],
})
export class WorkSessionsModule {}
