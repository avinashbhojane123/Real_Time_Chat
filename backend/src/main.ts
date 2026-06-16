import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  app.enableCors({
    origin: '*',
    methods: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(
    join(__dirname, '..', 'uploads'),
    {
      prefix: '/api/uploads/',
    },
  );

  app.setGlobalPrefix('api');

  // await app.listen(3000);
  await app.listen(process.env.PORT || 10000);

  console.log(
    'Application running on: http://localhost:10000/api',
  );
}

bootstrap();
