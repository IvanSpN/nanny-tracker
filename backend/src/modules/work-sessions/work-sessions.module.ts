import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsController } from './work-sessions.controller';
import { WorkSession } from './models/work-sessions';
import { WorkSessionExpense } from './models/work-session-expense.model';
import { ClientSpecialDay } from '../clients/models/client-special-day.model';
import { Client } from '../clients/models/client.model';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    SequelizeModule.forFeature([WorkSession, WorkSessionExpense, Client, ClientSpecialDay]),
    WorkersModule,
  ],
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService],
})
export class WorkSessionsModule {}
