import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, type WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CreateWorkSessionDto, WorkSessionExpenseDto } from './dto/create-work-session.dto';
import { UpdateWorkSessionDto } from './dto/update-work-session.dto';
import { FindWorkSessionsQueryDto } from './dto/find-work-sessions-query.dto';
import { UpdateWorkSessionStatusDto } from './dto/update-work-session-status.dto';
import { WorkSession, WorkSessionRateType, WorkSessionStatus } from './models/work-sessions';
import { WorkSessionExpense } from './models/work-session-expense.model';
import { Client } from '../clients/models/client.model';
import { ClientSpecialDay } from '../clients/models/client-special-day.model';
import { WorkersService } from '../workers/workers.service';
import { Worker } from '../workers/models/worker.model';

type WorkSessionClientResponse = {
  id: string;
  name: string;
};

type WorkSessionExpenseResponse = {
  id: string;
  amount: string;
  description: string;
};

type ResolvedRate = {
  rateType: WorkSessionRateType;
  rateValue: string;
};

type WorkSessionResponse = {
  id: string;
  clientId: string;
  client: WorkSessionClientResponse;
  workDate: string;
  startTime: string;
  endTime: string;
  workedMinutes: number;
  hours: number;
  rateType: WorkSessionRateType;
  rateValue: string;
  amount: string;
  expenses: WorkSessionExpenseResponse[];
  expensesAmount: string;
  totalAmount: string;
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
    @InjectModel(WorkSessionExpense)
    private readonly workSessionExpenseModel: typeof WorkSessionExpense,
    private readonly workersService: WorkersService,
    private readonly sequelize: Sequelize,
  ) {}

  async createForWorker(userId: string, dto: CreateWorkSessionDto): Promise<WorkSessionResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const client = await this.findOwnedClient(worker.id, dto.clientId);
    const workedMinutes = this.calculateWorkedMinutes(dto.startTime, dto.endTime);
    const { rateType, rateValue } = this.resolveRate(client, dto.workDate, dto.rateType);
    const amount = this.calculateAmount(rateValue, workedMinutes);

    const workSession = await this.sequelize.transaction(async (transaction) => {
      const workSession = await this.workSessionModel.create(
        {
          workerId: worker.id,
          clientId: client.id,
          workDate: dto.workDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          workedMinutes,
          rateType,
          rateValue,
          amount,
          comment: dto.comment?.trim() || null,
          status: WorkSessionStatus.PENDING,
          confirmedAt: null,
        },
        { transaction },
      );

      if (dto.expenses?.length) {
        await this.replaceExpenses(workSession.id, dto.expenses, transaction);
      }

      return workSession;
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
      include: [this.clientInclude, this.expensesInclude],
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
    const client = await this.findOwnedClient(worker.id, dto.clientId ?? workSession.clientId);
    const workDate = dto.workDate ?? workSession.workDate;
    const startTime = dto.startTime ?? workSession.startTime;
    const endTime = dto.endTime ?? workSession.endTime;
    const workedMinutes = this.calculateWorkedMinutes(startTime, endTime);
    const requestedRateType = dto.rateType ?? (dto.workDate ? undefined : workSession.rateType);
    // Ставка фиксируется в смене: цены клиента могли поменяться, а правка
    // комментария или времени не должна переоценивать уже сохранённую смену.
    const isRateChanged =
      client.id !== workSession.clientId ||
      workDate !== workSession.workDate ||
      this.isManualHoliday(workDate, requestedRateType) !==
        this.isManualHoliday(workSession.workDate, workSession.rateType);
    const { rateType, rateValue } = isRateChanged
      ? this.resolveRate(client, workDate, requestedRateType)
      : { rateType: workSession.rateType, rateValue: workSession.rateValue };
    const amount = this.calculateAmount(rateValue, workedMinutes);

    await this.sequelize.transaction(async (transaction) => {
      await workSession.update(
        {
          clientId: client.id,
          workDate,
          startTime,
          endTime,
          workedMinutes,
          rateType,
          rateValue,
          amount,
          comment: dto.comment === undefined ? workSession.comment : dto.comment?.trim() || null,
        },
        { transaction },
      );

      if (dto.expenses !== undefined) {
        await this.replaceExpenses(workSession.id, dto.expenses, transaction);
      }
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

  private get expensesInclude() {
    return {
      model: WorkSessionExpense,
      as: 'expenses',
      attributes: ['id', 'amount', 'description', 'createdAt'],
    };
  }

  private async replaceExpenses(
    workSessionId: string,
    expenses: WorkSessionExpenseDto[],
    transaction: Transaction,
  ): Promise<void> {
    await this.workSessionExpenseModel.destroy({
      where: {
        workSessionId,
      },
      transaction,
    });

    await this.workSessionExpenseModel.bulkCreate(
      expenses.map((expense) => ({
        workSessionId,
        amount: expense.amount,
        description: expense.description.trim(),
      })),
      { transaction },
    );
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
      include: [
        {
          model: ClientSpecialDay,
          as: 'specialDays',
          attributes: ['weekday', 'rate'],
        },
      ],
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
      include: [this.clientInclude, this.expensesInclude],
    });

    if (!workSession) {
      throw new NotFoundException('Смена не найдена');
    }

    return workSession;
  }

  private calculateWorkedMinutes(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    const workedMinutes = (endMinutes - startMinutes + 24 * 60) % (24 * 60) || 24 * 60;

    if (workedMinutes < 15) {
      throw new BadRequestException('Минимальная продолжительность смены — 15 минут');
    }

    return workedMinutes;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  /**
   * Приоритет: особый день клиента → выходной (сб/вс) или праздник → обычная ставка.
   */
  private resolveRate(
    client: Client,
    workDate: string,
    requestedRateType?: WorkSessionRateType,
  ): ResolvedRate {
    const weekday = this.getIsoWeekday(workDate);
    const specialDay = client.specialDays?.find((item) => item.weekday === weekday);

    if (specialDay) {
      return {
        rateType: WorkSessionRateType.SPECIAL,
        rateValue: specialDay.rate,
      };
    }

    if (weekday >= 6 || requestedRateType === WorkSessionRateType.WEEKEND) {
      return {
        rateType: WorkSessionRateType.WEEKEND,
        rateValue: client.weekendRate ?? client.regularRate,
      };
    }

    return {
      rateType: WorkSessionRateType.REGULAR,
      rateValue: client.regularRate,
    };
  }

  private isManualHoliday(workDate: string, rateType?: WorkSessionRateType): boolean {
    return rateType === WorkSessionRateType.WEEKEND && this.getIsoWeekday(workDate) < 6;
  }

  private getIsoWeekday(workDate: string): number {
    const day = new Date(`${workDate}T00:00:00.000Z`).getUTCDay();

    return day === 0 ? 7 : day;
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
    const expenses = [...(workSession.expenses ?? [])].sort(
      (first, second) => first.createdAt.getTime() - second.createdAt.getTime(),
    );
    const expensesMinorUnits = expenses.reduce(
      (total, expense) => total + this.decimalToMinorUnits(expense.amount),
      0,
    );
    const totalMinorUnits = this.decimalToMinorUnits(workSession.amount) + expensesMinorUnits;

    return {
      id: workSession.id,
      clientId: workSession.clientId,
      client: {
        id: workSession.client.id,
        name: workSession.client.name,
      },
      workDate: workSession.workDate,
      startTime: workSession.startTime.slice(0, 5),
      endTime: workSession.endTime.slice(0, 5),
      workedMinutes: workSession.workedMinutes,
      hours: workSession.workedMinutes / 60,
      rateType: workSession.rateType,
      rateValue: workSession.rateValue,
      amount: workSession.amount,
      expenses: expenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
      })),
      expensesAmount: this.minorUnitsToDecimal(expensesMinorUnits),
      totalAmount: this.minorUnitsToDecimal(totalMinorUnits),
      comment: workSession.comment,
      status: workSession.status,
      confirmedAt: workSession.confirmedAt,
    };
  }
}
