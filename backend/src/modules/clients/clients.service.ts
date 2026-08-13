import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './models/client.model';
import { User, UserRole } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { Worker } from '../workers/models/worker.model';
import { generatePassword } from '../../common/utils/generate-password';
import { generateClientLogin } from '../../common/utils/generate-client-login';

type ClientResponse = {
  id: string;
  name: string;
  regularRate: string;
  weekendRate: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  isInitialPasswordChanged: boolean;
};

type ClientCredentials = {
  login: string;
  password: string;
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client)
    private readonly clientModel: typeof Client,
    private readonly usersService: UsersService,
    private readonly workersService: WorkersService,
    private readonly sequelize: Sequelize,
  ) {}

  async createForWorker(
    userId: string,
    dto: CreateClientDto,
  ): Promise<{ client: ClientResponse; credentials: ClientCredentials }> {
    const worker = await this.getWorkerByUserId(userId);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const login = await this.generateUniqueLogin();

      try {
        const client = await this.sequelize.transaction(async (transaction) => {
          const user = await this.usersService.create(
            {
              login,
              email: null,
              passwordHash,
              role: UserRole.CLIENT,
              isInitialPasswordChanged: false,
            },
            transaction,
          );

          const client = await this.clientModel.create(
            {
              workerId: worker.id,
              userId: user.id,
              name: dto.name.trim(),
              regularRate: dto.regularRate,
              weekendRate: dto.weekendRate?.trim() || null,
              phone: dto.phone?.trim() || null,
              notes: dto.notes?.trim() || null,
              isActive: true,
            },
            {
              transaction,
            },
          );

          return {
            client,
            isInitialPasswordChanged: user.isInitialPasswordChanged,
          };
        });

        return {
          client: this.toClientResponse(client.client, client.isInitialPasswordChanged),
          credentials: {
            login,
            password,
          },
        };
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Не удалось сгенерировать уникальный логин клиента');
  }

  async findAllForWorker(userId: string): Promise<ClientResponse[]> {
    const worker = await this.getWorkerByUserId(userId);
    const clients = await this.clientModel.findAll({
      where: {
        workerId: worker.id,
      },
      include: [
        {
          model: User,
          as: 'account',
          attributes: ['id', 'isInitialPasswordChanged'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return clients.map((client) => this.toClientResponse(client));
  }

  async findOneForWorker(userId: string, id: string): Promise<ClientResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const client = await this.findOwnedClient(worker.id, id);

    return this.toClientResponse(client);
  }

  async findOneForClientUser(userId: string): Promise<ClientResponse> {
    const client = await this.clientModel.findOne({
      where: {
        userId,
      },
      include: [
        {
          model: User,
          as: 'account',
          attributes: ['id', 'isInitialPasswordChanged'],
        },
      ],
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return this.toClientResponse(client);
  }

  async updateForWorker(userId: string, id: string, dto: UpdateClientDto): Promise<ClientResponse> {
    const worker = await this.getWorkerByUserId(userId);
    const client = await this.findOwnedClient(worker.id, id);

    await client.update({
      name: dto.name === undefined ? client.name : dto.name.trim(),
      regularRate: dto.regularRate === undefined ? client.regularRate : dto.regularRate,
      weekendRate:
        dto.weekendRate === undefined ? client.weekendRate : dto.weekendRate?.trim() || null,
      phone: dto.phone === undefined ? client.phone : dto.phone?.trim() || null,
      notes: dto.notes === undefined ? client.notes : dto.notes?.trim() || null,
    });

    return this.toClientResponse(await this.findOwnedClient(worker.id, id));
  }

  async resetPasswordForWorker(
    userId: string,
    id: string,
  ): Promise<{ credentials: ClientCredentials }> {
    const worker = await this.getWorkerByUserId(userId);
    const client = await this.findOwnedClient(worker.id, id);
    const account = await this.usersService.findById(client.userId);

    if (!account) {
      throw new NotFoundException('Аккаунт клиента не найден');
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await this.sequelize.transaction((transaction) =>
      this.usersService.updatePassword(account.id, passwordHash, transaction, false),
    );

    return {
      credentials: {
        login: account.login,
        password,
      },
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
          model: User,
          as: 'account',
          attributes: ['id', 'isInitialPasswordChanged'],
        },
      ],
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  private async generateUniqueLogin(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const login = generateClientLogin();
      const existingUser = await this.usersService.findByLogin(login);

      if (!existingUser) {
        return login;
      }
    }

    throw new ConflictException('Не удалось сгенерировать уникальный логин клиента');
  }

  private toClientResponse(
    client: Client,
    isInitialPasswordChanged = client.account?.isInitialPasswordChanged ?? true,
  ): ClientResponse {
    return {
      id: client.id,
      name: client.name,
      regularRate: client.regularRate,
      weekendRate: client.weekendRate,
      phone: client.phone,
      notes: client.notes,
      isActive: client.isActive,
      isInitialPasswordChanged,
    };
  }
}
