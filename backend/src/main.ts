import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://front-end-is6k.onrender.com',
  ];

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : defaultOrigins;

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
  const uploadPath = join(process.cwd(), uploadDirName);

  console.log('Uploads folder:', uploadPath);

  const uploadPrefix = process.env.UPLOAD_PREFIX || '/uploads/';

  app.useStaticAssets(uploadPath, {
    prefix: uploadPrefix,
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
      res.set('X-Frame-Options', 'DENY');
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    },
  });

  const globalPrefix = process.env.GLOBAL_PREFIX || 'api';
  const excludePath = uploadDirName + '/(.*)';

  app.setGlobalPrefix(globalPrefix, {
    exclude: [excludePath, uploadDirName],
  });

  const port = Number(process.env.PORT || 10000);

  await app.listen(port);

  console.log(`Application running on port ${port}`);
}

bootstrap();
