import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WorkSessionsService } from './work-sessions.service';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { UpdateWorkSessionDto } from './dto/update-work-session.dto';
import { FindWorkSessionsQueryDto } from './dto/find-work-sessions-query.dto';
import { UpdateWorkSessionStatusDto } from './dto/update-work-session-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/models/user.model';
import { WorkSessionRateType, WorkSessionStatus } from './models/work-sessions';

type RequestWithUser = Request & {
  user: {
    id: string;
    role: UserRole;
  };
};

const workSessionClientSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '2f1842e6-9568-468c-9d0d-f97eaa51ee59',
    },
    name: {
      type: 'string',
      example: 'Анна Петрова',
    },
  },
};

const workSessionResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '64344c1d-75e9-4cf3-8f1c-e0edbf3b68ed',
    },
    clientId: {
      type: 'string',
      format: 'uuid',
      example: '2f1842e6-9568-468c-9d0d-f97eaa51ee59',
    },
    client: workSessionClientSchema,
    workDate: {
      type: 'string',
      format: 'date',
      example: '2026-07-13',
    },
    workedMinutes: {
      type: 'number',
      example: 270,
    },
    hours: {
      type: 'number',
      example: 4.5,
    },
    rateType: {
      enum: Object.values(WorkSessionRateType),
      example: WorkSessionRateType.REGULAR,
    },
    rateValue: {
      type: 'string',
      example: '1500.00',
      description: 'Snapshot ставки на момент создания/изменения смены',
    },
    amount: {
      type: 'string',
      example: '6750.00',
      description: 'Расчётная сумма за смену',
    },
    comment: {
      type: 'string',
      nullable: true,
      example: 'Вечерняя смена',
    },
    status: {
      enum: Object.values(WorkSessionStatus),
      example: WorkSessionStatus.PENDING,
    },
    confirmedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
  },
};

@ApiTags('Work Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER)
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private readonly workSessionsService: WorkSessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Создать смену для своего клиента',
  })
  @ApiCreatedResponse({
    description: 'Смена создана. Ставка и сумма рассчитаны на backend.',
    schema: workSessionResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Ошибка валидации тела запроса',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Работник или клиент не найден',
  })
  create(@Req() req: RequestWithUser, @Body() createWorkSessionDto: CreateWorkSessionDto) {
    return this.workSessionsService.createForWorker(req.user.id, createWorkSessionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить свои смены за период',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    example: '2026-07-13',
    description: 'Начало периода',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    example: '2026-07-19',
    description: 'Конец периода',
  })
  @ApiOkResponse({
    description: 'Список смен текущего работника',
    schema: {
      type: 'array',
      items: workSessionResponseSchema,
    },
  })
  @ApiBadRequestResponse({
    description: 'Ошибка валидации query-параметров',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  findAll(@Req() req: RequestWithUser, @Query() query: FindWorkSessionsQueryDto) {
    return this.workSessionsService.findAllForWorker(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить одну свою смену',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID смены',
  })
  @ApiOkResponse({
    description: 'Смена текущего работника',
    schema: workSessionResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiBadRequestResponse({
    description: 'Некорректный ID смены',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Смена не найдена',
  })
  findOne(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workSessionsService.findOneForWorker(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Изменить свою смену',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID смены',
  })
  @ApiOkResponse({
    description: 'Смена обновлена. Ставка и сумма пересчитаны на backend.',
    schema: workSessionResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Ошибка валидации тела запроса или ID смены',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Смена или клиент не найден',
  })
  update(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkSessionDto: UpdateWorkSessionDto,
  ) {
    return this.workSessionsService.updateForWorker(req.user.id, id, updateWorkSessionDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Изменить статус своей смены',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID смены',
  })
  @ApiOkResponse({
    description: 'Статус смены обновлён. confirmedAt заполняется только для confirmed.',
    schema: workSessionResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Ошибка валидации тела запроса или ID смены',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Смена не найдена',
  })
  updateStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateWorkSessionStatusDto,
  ) {
    return this.workSessionsService.updateStatusForWorker(req.user.id, id, updateStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить свою смену',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID смены',
  })
  @ApiNoContentResponse({
    description: 'Смена удалена',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiBadRequestResponse({
    description: 'Некорректный ID смены',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Смена не найдена',
  })
  remove(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workSessionsService.removeForWorker(req.user.id, id);
  }
}
