import { Body, Controller, HttpCode, HttpStatus, Post, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получить новый access-токен по refresh-токену',
  })
  @ApiOkResponse({
    description: 'Новый access-токен; срок жизни refresh-токена продлён',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh-токен неизвестен или истёк — нужно войти заново',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Выход: отозвать refresh-токен',
  })
  @ApiNoContentResponse({
    description: 'Refresh-токен отозван (или его уже не было)',
  })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить текущего пользователя по JWT-токену',
  })
  me(@Req() req: RequestWithUser) {
    return this.authService.me(req.user.id);
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
