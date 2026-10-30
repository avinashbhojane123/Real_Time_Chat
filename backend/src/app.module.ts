import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomsModule } from './rooms/rooms.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { StatusModule } from './status/status.module';
import { KeepAliveModule } from './keep-alive/keep-alive.module';
import { InstagramModule } from './instagram/instagram.module';
import { MoviesModule } from './movies/movies.module';

const isProduction = process.env.NODE_ENV === 'production';
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

const isSupabase =
  Boolean(dbUrl && dbUrl.includes('supabase')) ||
  Boolean(process.env.DB_HOST && process.env.DB_HOST.includes('supabase'));

const isSslEnabled =
  process.env.DB_SSL === 'true' ||
  isSupabase ||
  (process.env.DB_SSL !== 'false' && (isProduction || Boolean(dbUrl)));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as any) || 'postgres',

      ...(dbUrl
        ? { url: dbUrl }
        : {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
          }),

      ...(process.env.DB_TYPE === 'sqlite' ||
      process.env.DB_TYPE === 'better-sqlite3'
        ? {}
        : {
            ssl: isSslEnabled
              ? {
                  rejectUnauthorized:
                    process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
                }
              : false,
            extra: isSslEnabled
              ? {
                  ssl: {
                    rejectUnauthorized:
                      process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
                  },
                }
              : undefined,
          }),

      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    }),

    RoomsModule,
    ChatModule,
    UploadModule,
    StatusModule,
    KeepAliveModule,
    InstagramModule,
    MoviesModule,
  ],
})
export class AppModule {}
