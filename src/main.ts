import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'], bodyParser: false });
  app.use(json({ limit: '6mb' }));            // スキャン画像(base64)受信用
  app.use(urlencoded({ extended: true, limit: '6mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`Catcheez M1 mock API → http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
