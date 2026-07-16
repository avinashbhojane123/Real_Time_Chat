import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsePipes, ValidationPipe, OnApplicationBootstrap } from '@nestjs/common';

import { Room } from '../rooms/room.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TypingDto } from './dto/typing.dto';
import { GetRoomDto } from './dto/get-room.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnApplicationBootstrap
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    console.log('Resetting all users online status to offline on startup...');
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ isOnline: false })
      .execute();
  }

  private users = new Map<
    string,
    {
      nickname: string;
      passcode: string;
    }
  >();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    const userInfo = this.users.get(client.id);

    if (!userInfo) return;

    this.users.delete(client.id);

    // Check if there's another active socket connected for the same user
    const isStillConnected = Array.from(this.users.values()).some(
      (info) => info.nickname === userInfo.nickname && info.passcode === userInfo.passcode
    );

    if (isStillConnected) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: {
        passcode: userInfo.passcode,
      },
    });

    if (room) {
      const user = await this.userRepo.findOne({
        where: {
          nickname: userInfo.nickname,
          roomId: room.id,
        },
      });

      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();

        await this.userRepo.save(user);
      }

      const updatedUsers = await this.userRepo.find({
        where: {
          roomId: room.id,
        },
        order: {
          nickname: 'ASC',
        },
      });

      this.server.to(room.passcode).emit(
        'usersList',
        updatedUsers.map((user) => ({
          id: user.id,
          nickname: user.nickname,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          deviceType: user.deviceType,
          deviceModel: user.deviceModel,
          browser: user.browser,
          os: user.os,
        })),
      );
    }

    this.server
      .to(userInfo.passcode)
      .emit('userOffline', {
        nickname: userInfo.nickname,
        lastSeen: new Date(),
      });

    this.server
      .to(userInfo.passcode)
      .emit('userLeft', {
        nickname: userInfo.nickname,
      });
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody()
    data: JoinRoomDto,
    @ConnectedSocket()
    client: Socket,
  ) {
    console.log(
      'JOIN ROOM:',
      data.nickname,
      data.deviceType || '',
      data.deviceModel || '',
      data.browser || '',
      data.os || '',
    );

    let room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      room = this.roomRepo.create({
        passcode: data.passcode,
        roomName: `Room-${data.passcode}`,
      });

      room = await this.roomRepo.save(room);
    }

    let user = await this.userRepo.findOne({
      where: {
        nickname: data.nickname,
        roomId: room.id,
      },
    });

    if (!user) {
      user = this.userRepo.create({
        nickname: data.nickname,
        roomId: room.id,
        isOnline: true,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel,
        browser: data.browser,
        os: data.os,
      });
    } else {
      user.isOnline = true;
      user.lastSeen = null;
      user.deviceType = data.deviceType || user.deviceType;
      user.deviceModel = data.deviceModel || user.deviceModel;
      user.browser = data.browser || user.browser;
      user.os = data.os || user.os;
    }

    await this.userRepo.save(user);

    client.join(room.passcode);

    this.users.set(client.id, {
      nickname: data.nickname,
      passcode: room.passcode,
    });

    const messages = await this.messageRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    client.emit('chatHistory', messages);

    const roomUsers = await this.userRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        nickname: 'ASC',
      },
    });

    this.server.to(room.passcode).emit(
      'usersList',
      roomUsers.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        deviceType: user.deviceType,
        deviceModel: user.deviceModel,
        browser: user.browser,
        os: user.os,
      })),
    );

    this.server.to(room.passcode).emit('userOnline', {
      nickname: data.nickname,
    });

    this.server.to(room.passcode).emit('userJoined', {
      nickname: data.nickname,
    });

    return {
      success: true,
      roomId: room.id,
      passcode: room.passcode,
    };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody()
    data: SendMessageDto,
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      return {
        success: false,
        message: 'Room not found',
      };
    }

    const savedMessage = this.messageRepo.create({
      roomId: room.id,
      nickname: data.nickname,
      message: data.message,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileType: data.fileType ?? null,
      fileSize: typeof data.fileSize === 'string' ? parseInt(data.fileSize, 10) : (data.fileSize ?? null),
    });

    await this.messageRepo.save(savedMessage);

    this.server.to(room.passcode).emit('newMessage', {
      id: savedMessage.id,
      roomId: room.id,
      nickname: savedMessage.nickname,
      message: savedMessage.message,
      createdAt: savedMessage.createdAt,
      replyTo: savedMessage.replyTo,
      fileUrl: savedMessage.fileUrl,
      fileName: savedMessage.fileName,
      fileType: savedMessage.fileType,
      fileSize: savedMessage.fileSize,
    });

    return {
      success: true,
    };
  }

  @SubscribeMessage('getMessages')
  async getMessages(
    @MessageBody()
    data: GetRoomDto,
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      return [];
    }

    return await this.messageRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: TypingDto,
  ) {
    client.to(data.passcode).emit('userTyping', {
      nickname: data.nickname,
    });
  }

  @SubscribeMessage('stopTyping')
  stopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: TypingDto,
  ) {
    client.to(data.passcode).emit('userStoppedTyping', {
      nickname: data.nickname,
    });
  }

  @SubscribeMessage('getUsers')
  async getUsers(
    @MessageBody()
    data: GetRoomDto,
    @ConnectedSocket()
    client: Socket,
  ) {
    const room = await this.roomRepo.findOne({
      where: {
        passcode: data.passcode,
      },
    });

    if (!room) {
      client.emit('usersList', []);
      return;
    }

    const users = await this.userRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        nickname: 'ASC',
      },
    });

    client.emit(
      'usersList',
      users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        deviceType: user.deviceType,
        deviceModel: user.deviceModel,
        browser: user.browser,
        os: user.os,
      })),
    );
  }
}
