import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatGateway } from './chat.gateway';

import { Room } from '../rooms/room.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';
import { Status } from '../status/status.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Room,
      Message,
      User,
      Status,
    ]),
  ],
  providers: [ChatGateway],
})
export class ChatModule {}