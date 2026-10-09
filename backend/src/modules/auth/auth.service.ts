import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { JwtPayload } from './types/jwt-payload';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './models/refresh-token.model';

const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly workersService: WorkersService,
    private readonly sequelize: Sequelize,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken)
    private readonly refreshTokenModel: typeof RefreshToken,
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

    const tokens = await this.issueTokens(result.user.id, result.user.role);

    return {
      ...tokens,
      user: {
        ...this.toAuthUser(result.user),
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

    const tokens = await this.issueTokens(user.id, user.role);

    return {
      ...tokens,
      user: {
        ...this.toAuthUser(user),
      },
    };
  }

  async refresh(refreshToken: string) {
    const record = await this.refreshTokenModel.findOne({
      where: { tokenHash: this.hashToken(refreshToken) },
    });

    if (!record) {
      throw new UnauthorizedException('Сессия недействительна, войдите заново');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await record.destroy();

      throw new UnauthorizedException('Сессия истекла, войдите заново');
    }

    const user = await this.usersService.findById(record.userId);

    if (!user) {
      await record.destroy();

      throw new UnauthorizedException('Сессия недействительна, войдите заново');
    }

    // Скользящее окно: пока человек пользуется приложением, сессия не истекает.
    record.expiresAt = this.getRefreshTokenExpiresAt();
    await record.save();

    return {
      accessToken: await this.generateAccessToken(user.id, user.role),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenModel.destroy({
      where: { tokenHash: this.hashToken(refreshToken) },
    });
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.toAuthUser(user);
  }

  private async issueTokens(userId: string, role: UserRole) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, role),
      this.createRefreshToken(userId),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const refreshToken = randomBytes(48).toString('base64url');

    await this.refreshTokenModel.create({
      userId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });

    // Чистим просроченные токены этого пользователя, чтобы таблица не росла.
    await this.refreshTokenModel.destroy({
      where: {
        userId,
        expiresAt: { [Op.lt]: new Date() },
      },
    });

    return refreshToken;
  }

  private getRefreshTokenExpiresAt(): Date {
    const configuredDays = Number(this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS'));
    const ttlDays =
      Number.isFinite(configuredDays) && configuredDays > 0
        ? configuredDays
        : DEFAULT_REFRESH_TOKEN_TTL_DAYS;

    return new Date(Date.now() + ttlDays * DAY_MS);
  }

  // Refresh-токен — случайная строка с большой энтропией, поэтому хватает SHA-256 без соли.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateAccessToken(userId: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      role,
    };

    return this.jwtService.signAsync(payload);
  }

  private toAuthUser(user: User) {
    return {
      id: user.id,
      login: user.login,
      email: user.email,
      role: user.role,
      isInitialPasswordChanged: user.isInitialPasswordChanged,
    };
  }
}
