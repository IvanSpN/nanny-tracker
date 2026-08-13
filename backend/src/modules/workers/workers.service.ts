import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Worker } from './models/worker.model';
import { CreateWorkerData } from './types/create-worker-data.type';
import { UpdateWorkerDto } from './dto/update-worker.dto';

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

  async findProfileByUserId(userId: string) {
    const worker = await this.findByUserId(userId);

    if (!worker) {
      throw new NotFoundException('Работник не найден');
    }

    return this.toWorkerResponse(worker);
  }

  async updateProfileByUserId(userId: string, dto: UpdateWorkerDto) {
    const worker = await this.findByUserId(userId);

    if (!worker) {
      throw new NotFoundException('Работник не найден');
    }

    await worker.update({
      name: dto.name.trim(),
    });

    return this.toWorkerResponse(worker);
  }

  private toWorkerResponse(worker: Worker) {
    return {
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      defaultRegularRate: worker.defaultRegularRate,
      defaultWeekendRate: worker.defaultWeekendRate,
      isActive: worker.isActive,
    };
  }
}
