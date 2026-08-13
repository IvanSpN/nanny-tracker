import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
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

const clientResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '3f49a5ba-03d8-4e39-b6f0-df0e01edcb3a',
    },
    name: {
      type: 'string',
      example: 'Анна Петрова',
    },
    regularRate: {
      type: 'string',
      example: '1500.00',
    },
    weekendRate: {
      type: 'string',
      nullable: true,
      example: '2000.00',
    },
    phone: {
      type: 'string',
      nullable: true,
      example: '+7 777 123 45 67',
    },
    notes: {
      type: 'string',
      nullable: true,
      example: null,
    },
    isActive: {
      type: 'boolean',
      example: true,
    },
    isInitialPasswordChanged: {
      type: 'boolean',
      example: false,
      description: 'Сменил ли клиент временный пароль после создания/сброса',
    },
  },
};

const credentialsSchema = {
  type: 'object',
  properties: {
    login: {
      type: 'string',
      example: 'client_h7k3m9q2pa',
    },
    password: {
      type: 'string',
      example: 'A7xQ9mP4tZ2b',
      description: 'Временный пароль возвращается только один раз и не хранится в базе',
    },
  },
};

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({
    summary: 'Создать клиента и временный аккаунт для входа',
  })
  @ApiCreatedResponse({
    description: 'Клиент создан. credentials.password возвращается только один раз в этом ответе.',
    schema: {
      type: 'object',
      properties: {
        client: clientResponseSchema,
        credentials: credentialsSchema,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiConflictResponse({
    description: 'Не удалось сгенерировать уникальный логин клиента',
  })
  create(@Req() req: RequestWithUser, @Body() createClientDto: CreateClientDto) {
    return this.clientsService.createForWorker(req.user.id, createClientDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить список своих клиентов',
  })
  @ApiOkResponse({
    description: 'Список клиентов текущего работника',
    schema: {
      type: 'array',
      items: clientResponseSchema,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  findAll(@Req() req: RequestWithUser) {
    return this.clientsService.findAllForWorker(req.user.id);
  }

  @Get('me')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: 'Получить профиль текущего клиента',
  })
  @ApiOkResponse({
    description: 'Профиль текущего клиента',
    schema: clientResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью client',
  })
  @ApiNotFoundResponse({
    description: 'Клиент не найден',
  })
  findMe(@Req() req: RequestWithUser) {
    return this.clientsService.findOneForClientUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить одного своего клиента',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID клиента',
  })
  @ApiOkResponse({
    description: 'Клиент текущего работника',
    schema: clientResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Клиент не найден',
  })
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.clientsService.findOneForWorker(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Изменить своего клиента',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID клиента',
  })
  @ApiOkResponse({
    description: 'Клиент обновлён',
    schema: clientResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Клиент не найден',
  })
  update(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.updateForWorker(req.user.id, id, updateClientDto);
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: 'Сбросить пароль своего клиента',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID клиента',
  })
  @ApiOkResponse({
    description: 'Новый временный пароль возвращается только один раз.',
    schema: {
      type: 'object',
      properties: {
        credentials: credentialsSchema,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'JWT-токен отсутствует или недействителен',
  })
  @ApiForbiddenResponse({
    description: 'Доступ разрешён только пользователям с ролью worker',
  })
  @ApiNotFoundResponse({
    description: 'Клиент не найден',
  })
  resetPassword(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.clientsService.resetPasswordForWorker(req.user.id, id);
  }
}
