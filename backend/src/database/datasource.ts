import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { Message } from '../messages/message.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chat_db',

  entities: [Room, User, Message],

  migrations: ['dist/migrations/*.js'],

  synchronize: true,
});