import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/models/user.model';

type RequestWithUser = Request & {
  user: {
    id: string;
    role: string;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Регистрация нового работника',
  })
  @ApiCreatedResponse({
    description: 'Работник успешно зарегистрирован',
  })
  register(@Body() dto: RegisterWorkerDto) {
    return this.authService.registerWorker(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Вход пользователя в систему',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить текущего пользователя по JWT-токену',
  })
  me(@Req() req: RequestWithUser) {
    return req.user;
  }

  @Get('worker-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Тестовый endpoint только для admin',
  })
  workerTest() {
    return {
      message: 'Доступ разрешён только для admin',
    };
  }
}
