import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';
import Worker from './models/worker.model';

@Module({
  imports: [SequelizeModule.forFeature([Worker])],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
