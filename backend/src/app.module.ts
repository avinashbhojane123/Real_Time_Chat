import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomsModule } from './rooms/rooms.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { InstagramModule } from './instagram/instagram.module';
import { StatusModule } from './status/status.module';
import { KeepAliveModule } from './keep-alive/keep-alive.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as any) || 'postgres',

      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),

      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'realtime_chat',

      ssl:
        process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized:
                process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
            }
          : false,

      autoLoadEntities: true,
      synchronize:
        process.env.DB_SYNCHRONIZE !== undefined
          ? process.env.DB_SYNCHRONIZE === 'true'
          : process.env.NODE_ENV !== 'production',
    }),

    RoomsModule,
    ChatModule,
    UploadModule,
    InstagramModule,
    StatusModule,
    KeepAliveModule,
  ],
})
export class AppModule {}
