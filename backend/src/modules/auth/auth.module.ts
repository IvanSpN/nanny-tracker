import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WorkersModule } from '../workers/workers.module';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { SignOptions } from 'jsonwebtoken';
import { JwtStrategy } from './strategies.ts/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { RefreshToken } from './models/refresh-token.model';

const DEFAULT_ACCESS_TOKEN_TTL = '7d';

@Module({
  imports: [
    SequelizeModule.forFeature([RefreshToken]),
    UsersModule,
    WorkersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');

        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || DEFAULT_ACCESS_TOKEN_TTL;

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
