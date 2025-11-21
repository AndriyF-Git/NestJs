import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальна валідація для DTO (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // викидає зайві поля з body
      forbidNonWhitelisted: true, // якщо прийшли лишні поля – кине помилку
      transform: true, // перетворює payload у екземпляри DTO
    }),
  );

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
}
bootstrap();
