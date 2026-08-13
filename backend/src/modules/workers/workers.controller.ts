import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WorkersService } from './workers.service';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/models/user.model';

type RequestWithUser = Request & {
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('Workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER)
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Получить профиль текущего работника',
  })
  @ApiOkResponse({
    description: 'Профиль текущего работника',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  findMe(@Req() req: RequestWithUser) {
    return this.workersService.findProfileByUserId(req.user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Изменить профиль текущего работника',
  })
  @ApiOkResponse({
    description: 'Профиль работника обновлён',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateWorkerDto) {
    return this.workersService.updateProfileByUserId(req.user.id, dto);
  }
}
