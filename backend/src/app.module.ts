// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// import { RoomsModule } from './rooms/rooms.module';
// import { UsersModule } from './users/users.module';
// import { MessagesModule } from './messages/messages.module';
// import { ChatModule } from './chat/chat.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }),

//     TypeOrmModule.forRoot({
//       type: 'postgres',

//       host: process.env.DB_HOST,
//       port: Number(process.env.DB_PORT),

//       username: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       database: process.env.DB_NAME,

//       autoLoadEntities: true,

//       synchronize: true,

//       ssl: {
//         rejectUnauthorized: false,
//       },

//       extra: {
//         ssl: {
//           rejectUnauthorized: false,
//         },
//       },

//       // logging: true,
//     }),

//     RoomsModule,
//     UsersModule,
//     MessagesModule,
//     ChatModule,
//   ],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomsModule } from './rooms/rooms.module';
import { UsersModule } from './users/users.module';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? 'chat_db',

      autoLoadEntities: true,
      synchronize: true,

      // logging: true,
    }),

    RoomsModule,
    UsersModule,
    MessagesModule,
    ChatModule,
    UploadModule,
  ],
})
export class AppModule {}
