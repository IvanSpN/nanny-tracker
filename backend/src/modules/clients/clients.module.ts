import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './models/client.model';
import { UsersModule } from '../users/users.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [SequelizeModule.forFeature([Client]), UsersModule, WorkersModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
