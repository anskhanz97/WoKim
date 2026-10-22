import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { environment } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = environment();
  app.set('trust proxy', 1);
  app.use(
    (
      request: Request & { requestId?: string },
      response: Response,
      next: NextFunction,
    ) => {
      request.requestId = randomUUID();
      response.setHeader('X-Request-Id', request.requestId);
      next();
    },
  );
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('WoKim API')
      .setDescription('Private API for the WoKim developer work memory.')
      .setVersion('0.1.0')
      .addCookieAuth('wm_session')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }, 'csrf')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, openApi, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  await app.listen(env.port, env.host);
  Logger.log(
    `WoKim API listening on http://${env.host}:${env.port}`,
    'Bootstrap',
  );
}
void bootstrap();
