import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Worker } from './models/worker.model';
import { CreateWorkerData } from './types/create-worker-data.type';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(Worker)
    private readonly workerModel: typeof Worker,
  ) {}

  async findById(id: string): Promise<Worker | null> {
    return this.workerModel.findByPk(id);
  }

  async findByUserId(userId: string): Promise<Worker | null> {
    return this.workerModel.findOne({
      where: {
        userId,
      },
    });
  }

  async create(data: CreateWorkerData, transaction?: Transaction): Promise<Worker> {
    return this.workerModel.create(
      {
        userId: data.userId,
        name: data.name,
        phone: data.phone ?? null,
        defaultRegularRate: data.defaultRegularRate ?? null,
        defaultWeekendRate: data.defaultWeekendRate ?? null,
        isActive: true,
      },
      {
        transaction,
      },
    );
  }
}
