import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { Message } from '../messages/message.entity';

export default new DataSource({
  type: (process.env.DB_TYPE as any) || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'realtime_chat',

  entities: [Room, User, Message],

  migrations: ['dist/migrations/*.js'],

  synchronize:
    process.env.DB_SYNCHRONIZE !== undefined
      ? process.env.DB_SYNCHRONIZE === 'true'
      : process.env.NODE_ENV !== 'production',
});