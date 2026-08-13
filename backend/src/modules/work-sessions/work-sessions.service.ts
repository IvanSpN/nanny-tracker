import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type WhereOptions } from 'sequelize';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { UpdateWorkSessionDto } from './dto/update-work-session.dto';
import { FindWorkSessionsQueryDto } from './dto/find-work-sessions-query.dto';
import { UpdateWorkSessionStatusDto } from './dto/update-work-session-status.dto';
import { WorkSession, WorkSessionRateType, WorkSessionStatus } from './models/work-sessions';
import { Client } from '../clients/models/client.model';
import { WorkersService } from '../workers/workers.service';
import { Worker } from '../workers/models/worker.model';

type WorkSessionClientResponse = {
  id: string;
  name: string;
};

type WorkSessionResponse = {
  id: string;
  clientId: string;
  client: WorkSessionClientResponse;
  workDate: string;
  workedMinutes: number;
  hours: number;
  rateType: WorkSessionRateType;
  rateValue: string;
  amount: string;
  comment: string | null;
  status: WorkSessionStatus;
  confirmedAt: Date | null;
};

@Injectable()
export class WorkSessionsService {
  constructor(
    @InjectModel(WorkSession)
    private readonly workSessionModel: typeof WorkSession,
    @InjectModel(Client)
    private readonly clientModel: typeof Client,
    private readonly workersService: WorkersService,
  ) {}

  async createForWorker(userId: string, dto: CreateWorkSessionDto): Promise<WorkSessionResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const client = await this.findOwnedClient(worker.id, dto.clientId);
    const workedMinutes = this.hoursToMinutes(dto.hours);
    const rateType = this.resolveRateType(dto.workDate, dto.rateType);
    const rateValue = this.getRateValue(client, rateType);
    const amount = this.calculateAmount(rateValue, workedMinutes);

    const workSession = await this.workSessionModel.create({
      workerId: worker.id,
      clientId: client.id,
      workDate: dto.workDate,
      workedMinutes,
      rateType,
      rateValue,
      amount,
      comment: dto.comment?.trim() || null,
      status: WorkSessionStatus.PENDING,
      confirmedAt: null,
    });

    return this.toWorkSessionResponse(await this.findOwnedSession(worker.id, workSession.id));
  }

  async findAllForWorker(
    userId: string,
    query: FindWorkSessionsQueryDto,
  ): Promise<WorkSessionResponse[]> {
    const worker = await this.getWorkerByUserId(userId);

    return this.findAllForOwner({ workerId: worker.id }, query);
  }

  async findAllForUser(
    userId: string,
    role: string,
    query: FindWorkSessionsQueryDto,
  ): Promise<WorkSessionResponse[]> {
    if (role === 'client') {
      const client = await this.findClientByUserId(userId);

      return this.findAllForOwner({ clientId: client.id }, query);
    }

    return this.findAllForWorker(userId, query);
  }

  private async findAllForOwner(
    ownerWhere: Record<string, unknown>,
    query: FindWorkSessionsQueryDto,
  ): Promise<WorkSessionResponse[]> {
    const where: Record<string, unknown> = {
      ...ownerWhere,
    };

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom не может быть позже dateTo');
    }

    if (query.dateFrom || query.dateTo) {
      where.workDate = {
        ...(query.dateFrom ? { [Op.gte]: query.dateFrom } : {}),
        ...(query.dateTo ? { [Op.lte]: query.dateTo } : {}),
      };
    }

    const workSessions = await this.workSessionModel.findAll({
      where: where as WhereOptions,
      include: [this.clientInclude],
      order: [
        ['workDate', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    return workSessions.map((workSession) => this.toWorkSessionResponse(workSession));
  }

  async findOneForWorker(userId: string, id: string): Promise<WorkSessionResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const workSession = await this.findOwnedSession(worker.id, id);

    return this.toWorkSessionResponse(workSession);
  }

  async updateForWorker(
    userId: string,
    id: string,
    dto: UpdateWorkSessionDto,
  ): Promise<WorkSessionResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const workSession = await this.findOwnedSession(worker.id, id);
    const client =
      dto.clientId && dto.clientId !== workSession.clientId
        ? await this.findOwnedClient(worker.id, dto.clientId)
        : workSession.client;
    const workDate = dto.workDate ?? workSession.workDate;
    const workedMinutes =
      dto.hours === undefined ? workSession.workedMinutes : this.hoursToMinutes(dto.hours);
    const requestedRateType = dto.rateType ?? (dto.workDate ? undefined : workSession.rateType);
    const rateType = this.resolveRateType(workDate, requestedRateType);
    const rateValue = this.getRateValue(client, rateType);
    const amount = this.calculateAmount(rateValue, workedMinutes);

    await workSession.update({
      clientId: client.id,
      workDate,
      workedMinutes,
      rateType,
      rateValue,
      amount,
      comment: dto.comment === undefined ? workSession.comment : dto.comment?.trim() || null,
    });

    return this.toWorkSessionResponse(await this.findOwnedSession(worker.id, id));
  }

  async updateStatusForWorker(
    userId: string,
    id: string,
    dto: UpdateWorkSessionStatusDto,
  ): Promise<WorkSessionResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const workSession = await this.findOwnedSession(worker.id, id);

    await workSession.update({
      status: dto.status,
      confirmedAt:
        dto.status === WorkSessionStatus.CONFIRMED ? (workSession.confirmedAt ?? new Date()) : null,
    });

    return this.toWorkSessionResponse(await this.findOwnedSession(worker.id, id));
  }

  async removeForWorker(userId: string, id: string): Promise<void> {
    const worker = await this.getWorkerByUserId(userId);
    const workSession = await this.findOwnedSession(worker.id, id);

    await workSession.destroy();
  }

  private get clientInclude() {
    return {
      model: Client,
      as: 'client',
      attributes: ['id', 'name', 'regularRate', 'weekendRate'],
    };
  }

  private async getWorkerByUserId(userId: string): Promise<Worker> {
    const worker = await this.workersService.findByUserId(userId);

    if (!worker) {
      throw new NotFoundException('Работник не найден');
    }

    return worker;
  }

  private async findOwnedClient(workerId: string, id: string): Promise<Client> {
    const client = await this.clientModel.findOne({
      where: {
        id,
        workerId,
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  private async findClientByUserId(userId: string): Promise<Client> {
    const client = await this.clientModel.findOne({
      where: {
        userId,
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  private async findOwnedSession(workerId: string, id: string): Promise<WorkSession> {
    const workSession = await this.workSessionModel.findOne({
      where: {
        id,
        workerId,
      },
      include: [this.clientInclude],
    });

    if (!workSession) {
      throw new NotFoundException('Смена не найдена');
    }

    return workSession;
  }

  private hoursToMinutes(hours: number): number {
    const workedMinutes = Math.round(hours * 60);

    if (workedMinutes < 1 || workedMinutes > 24 * 60) {
      throw new BadRequestException('Количество часов должно быть в диапазоне от 0.25 до 24');
    }

    return workedMinutes;
  }

  private resolveRateType(
    workDate: string,
    requestedRateType?: WorkSessionRateType,
  ): WorkSessionRateType {
    if (this.isWeekendDate(workDate)) {
      return WorkSessionRateType.WEEKEND;
    }

    if (requestedRateType === WorkSessionRateType.WEEKEND) {
      return WorkSessionRateType.WEEKEND;
    }

    return WorkSessionRateType.REGULAR;
  }

  private isWeekendDate(workDate: string): boolean {
    const day = new Date(`${workDate}T00:00:00.000Z`).getUTCDay();

    return day === 0 || day === 6;
  }

  private getRateValue(client: Client, rateType: WorkSessionRateType): string {
    if (rateType === WorkSessionRateType.WEEKEND) {
      return client.weekendRate ?? client.regularRate;
    }

    return client.regularRate;
  }

  private calculateAmount(rateValue: string, workedMinutes: number): string {
    const rateMinorUnits = this.decimalToMinorUnits(rateValue);
    const amountMinorUnits = Math.round((rateMinorUnits * workedMinutes) / 60);

    return this.minorUnitsToDecimal(amountMinorUnits);
  }

  private decimalToMinorUnits(value: string): number {
    const [wholePart = '0', fractionalPart = ''] = value.split('.');
    const normalizedFraction = fractionalPart.padEnd(2, '0').slice(0, 2);

    return Number(wholePart) * 100 + Number(normalizedFraction);
  }

  private minorUnitsToDecimal(value: number): string {
    const wholePart = Math.floor(value / 100);
    const fractionalPart = String(value % 100).padStart(2, '0');

    return `${wholePart}.${fractionalPart}`;
  }

  private toWorkSessionResponse(workSession: WorkSession): WorkSessionResponse {
    return {
      id: workSession.id,
      clientId: workSession.clientId,
      client: {
        id: workSession.client.id,
        name: workSession.client.name,
      },
      workDate: workSession.workDate,
      workedMinutes: workSession.workedMinutes,
      hours: workSession.workedMinutes / 60,
      rateType: workSession.rateType,
      rateValue: workSession.rateValue,
      amount: workSession.amount,
      comment: workSession.comment,
      status: workSession.status,
      confirmedAt: workSession.confirmedAt,
    };
  }
}
