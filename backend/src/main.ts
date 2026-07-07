import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nanny Work Tracker API')
    .setDescription('API для регистрации работников, управления клиентами и учёта рабочих смен')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocumentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocumentFactory);

  const port = configService.get<number>('PORT') || 4000;

  await app.listen(port);

  logger.log(`Backend started on http://localhost:${port}`);
  logger.log(`Swagger available on http://localhost:${port}/docs`);
}
void bootstrap();
