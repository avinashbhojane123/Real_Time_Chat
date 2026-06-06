// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';

// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: '*',
//     methods: '*',
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//       forbidNonWhitelisted: true,
//     }),
//   );

//   app.setGlobalPrefix('api');

//   const port = Number(process.env.PORT) || 3000;

//   await app.listen(port, '0.0.0.0');

//   console.log(
//     `Application running on port ${port}`,
//   );
// }

// bootstrap();


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
      prefix: '/uploads/',
    },
  );

  app.setGlobalPrefix('api');

  await app.listen(3000);

  console.log(
    'Application running on: http://localhost:3000/api',
  );
}

bootstrap();
