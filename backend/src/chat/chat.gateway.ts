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
import {
  EditMessageDto,
  DeleteMessageDto,
  ClearHistoryDto,
  ReactToMessageDto,
} from './dto/message-actions.dto';
import {
  CallUserDto,
  AcceptCallDto,
  DeclineCallDto,
  WebrtcOfferDto,
  WebrtcAnswerDto,
  WebrtcCandidateDto,
  EndCallDto,
} from './dto/call-signal.dto';

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

    // Start ephemeral message cleanup loop (runs every 5 seconds)
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredMessages = await this.messageRepo
          .createQueryBuilder('message')
          .leftJoinAndSelect('message.room', 'room')
          .where('message.expiresAt IS NOT NULL AND message.expiresAt <= :now', { now })
          .getMany();

        if (expiredMessages.length > 0) {
          const ids = expiredMessages.map(m => m.id);
          const roomPasscodes = Array.from(new Set(expiredMessages.map(m => m.room.passcode)));

          await this.messageRepo
            .createQueryBuilder()
            .delete()
            .from(Message)
            .where('id IN (:...ids)', { ids })
            .execute();

          console.log(`[Self-Destruct] Cleaned up ${ids.length} expired messages.`);

          for (const passcode of roomPasscodes) {
            const roomIds = expiredMessages.filter(m => m.room.passcode === passcode).map(m => m.id);
            this.server.to(passcode).emit('messagesExpired', { ids: roomIds });
          }
        }
      } catch (e) {
        console.error('Error during self-destruct messages cleanup', e);
      }
    }, 5000);
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
          avatarUrl: user.avatarUrl,
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
        avatarUrl: data.avatarUrl,
      });
    } else {
      user.isOnline = true;
      user.lastSeen = null;
      user.deviceType = data.deviceType || user.deviceType;
      user.deviceModel = data.deviceModel || user.deviceModel;
      user.browser = data.browser || user.browser;
      user.os = data.os || user.os;
      if (data.avatarUrl) {
        user.avatarUrl = data.avatarUrl;
      }
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
        avatarUrl: user.avatarUrl,
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
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) {
      return {
        success: false,
        message: 'Unauthorized connection details',
      };
    }

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

    let expiresAt: Date | null = null;
    if (data.expiresIn) {
      expiresAt = new Date(Date.now() + data.expiresIn * 1000);
    }

    const savedMessage = this.messageRepo.create({
      roomId: room.id,
      nickname: session.nickname,
      message: data.message,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileType: data.fileType ?? null,
      fileSize: typeof data.fileSize === 'string' ? parseInt(data.fileSize, 10) : (data.fileSize ?? null),
      expiresAt,
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
      isEdited: savedMessage.isEdited,
      isDeleted: savedMessage.isDeleted,
      reactions: savedMessage.reactions,
      expiresAt: savedMessage.expiresAt,
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
        avatarUrl: user.avatarUrl,
      })),
    );
  }

  @SubscribeMessage('callUser')
  callUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallUserDto,
  ) {
    console.log(`[CallUser] ${data.callerName} is calling in room: ${data.passcode}`);
    client.to(data.passcode).emit('userCalling', {
      callerName: data.callerName,
    });
  }

  @SubscribeMessage('acceptCall')
  acceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AcceptCallDto,
  ) {
    console.log(`[AcceptCall] ${data.receiverName} accepted the call in room: ${data.passcode}`);
    client.to(data.passcode).emit('callAccepted', {
      receiverName: data.receiverName,
    });
  }

  @SubscribeMessage('declineCall')
  declineCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeclineCallDto,
  ) {
    console.log(`[DeclineCall] ${data.receiverName} declined the call in room: ${data.passcode}`);
    client.to(data.passcode).emit('callDeclined', {
      receiverName: data.receiverName,
    });
  }

  @SubscribeMessage('webrtcOffer')
  webrtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcOfferDto,
  ) {
    console.log(`[WebRTCOffer] Relaying WebRTC offer in room: ${data.passcode}`);
    client.to(data.passcode).emit('webrtcOfferRelay', {
      offer: data.offer,
    });
  }

  @SubscribeMessage('webrtcAnswer')
  webrtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcAnswerDto,
  ) {
    console.log(`[WebRTCAnswer] Relaying WebRTC answer in room: ${data.passcode}`);
    client.to(data.passcode).emit('webrtcAnswerRelay', {
      answer: data.answer,
    });
  }

  @SubscribeMessage('webrtcCandidate')
  webrtcCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcCandidateDto,
  ) {
    console.log(`[WebRTCCandidate] Relaying WebRTC ICE candidate in room: ${data.passcode}`);
    client.to(data.passcode).emit('webrtcCandidateRelay', {
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('endCall')
  endCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EndCallDto,
  ) {
    console.log(`[EndCall] Relaying endCall in room: ${data.passcode}`);
    client.to(data.passcode).emit('callEnded');
  }

  @SubscribeMessage('editMessage')
  async editMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EditMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId },
    });
    if (!msg) return;

    if (msg.nickname !== session.nickname) {
      return; // Unauthorized edit attempt!
    }

    if (data.newMessage !== undefined) {
      msg.message = data.newMessage;
    }
    if (data.fileUrl !== undefined) {
      msg.fileUrl = data.fileUrl;
    }
    msg.isEdited = true;
    await this.messageRepo.save(msg);

    this.server.to(data.passcode).emit('messageEdited', {
      messageId: msg.id,
      newMessage: msg.message,
      fileUrl: msg.fileUrl,
    });
  }

  @SubscribeMessage('deleteMessage')
  async deleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId },
    });
    if (!msg) return;

    if (msg.nickname !== session.nickname) {
      return; // Unauthorized delete attempt!
    }

    msg.isDeleted = true;
    msg.message = 'This message was deleted';
    msg.fileUrl = null;
    msg.fileName = null;
    msg.fileType = null;
    msg.fileSize = null;
    await this.messageRepo.save(msg);

    this.server.to(data.passcode).emit('messageDeleted', {
      messageId: msg.id,
    });
  }

  @SubscribeMessage('clearHistory')
  async clearHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClearHistoryDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode },
    });
    if (!room) return;

    await this.messageRepo.delete({ roomId: room.id });

    this.server.to(data.passcode).emit('historyCleared');
  }

  @SubscribeMessage('reactToMessage')
  async reactToMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactToMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId },
    });
    if (!msg) return;

    const reactions = msg.reactions || {};
    const activeNickname = session.nickname;
    let reactionUsers = reactions[data.emoji] || [];

    if (reactionUsers.includes(activeNickname)) {
      reactionUsers = reactionUsers.filter(u => u !== activeNickname);
    } else {
      reactionUsers.push(activeNickname);
    }

    if (reactionUsers.length === 0) {
      delete reactions[data.emoji];
    } else {
      reactions[data.emoji] = reactionUsers;
    }

    msg.reactions = Object.keys(reactions).length > 0 ? reactions : null;
    await this.messageRepo.save(msg);

    this.server.to(data.passcode).emit('messageReactionsUpdated', {
      messageId: msg.id,
      reactions: msg.reactions,
    });
  }
}
