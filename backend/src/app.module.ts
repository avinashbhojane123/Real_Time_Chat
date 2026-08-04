import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomsModule } from './rooms/rooms.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { InstagramModule } from './instagram/instagram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',

      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),

      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      ssl:
        process.env.NODE_ENV ===
        'production'
          ? {
              rejectUnauthorized:
                false,
            }
          : false,

      autoLoadEntities: true,
      // synchronize: process.env.NODE_ENV !== 'production',
synchronize: true,
      // logging: true,
    }),

    RoomsModule,
    ChatModule,
    UploadModule,
    InstagramModule,
  ],
})
export class AppModule {}


