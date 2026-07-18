import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { JwtPayload } from './types/jwt-payload';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly workersService: WorkersService,
    private readonly sequelize: Sequelize,
    private readonly jwtService: JwtService,
  ) {}

  async registerWorker(dto: RegisterWorkerDto) {
    const login = dto.login.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();

    const userWithSameLogin = await this.usersService.findByLogin(login);

    if (userWithSameLogin) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    const userWithSameEmail = await this.usersService.findByEmail(email);

    if (userWithSameEmail) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.sequelize.transaction(async (transaction) => {
      const user = await this.usersService.create(
        {
          login,
          email,
          passwordHash,
          role: UserRole.WORKER,
        },
        transaction,
      );

      const worker = await this.workersService.create(
        {
          userId: user.id,
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
        },
        transaction,
      );

      return {
        user,
        worker,
      };
    });

    const accessToken = await this.generateAccessToken(result.user.id, result.user.role);

    return {
      accessToken,
      user: {
        id: result.user.id,
        login: result.user.login,
        email: result.user.email,
        role: result.user.role,
      },
      worker: {
        id: result.worker.id,
        name: result.worker.name,
        phone: result.worker.phone,
      },
    };
  }

  async login(dto: LoginDto) {
    const login = dto.login.trim().toLowerCase();

    const user = await this.usersService.findByLogin(login);

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const accessToken = await this.generateAccessToken(user.id, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async generateAccessToken(userId: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      role,
    };

    return this.jwtService.signAsync(payload);
  }
}
