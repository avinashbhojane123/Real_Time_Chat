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
import {
  UsePipes,
  ValidationPipe,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

import { Room } from '../rooms/room.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';
import { Status } from '../status/status.entity';
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
  TogglePipDto,
} from './dto/call-signal.dto';
import {
  CreateStatusDto,
  GetStatusesDto,
  ViewStatusDto,
  DeleteStatusDto,
} from './dto/status.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : '*',
  },
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL || 10000),
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT || 5000),
})
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationBootstrap,
    OnModuleDestroy
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

    @InjectRepository(Status)
    private readonly statusRepo: Repository<Status>,
  ) {}

  private cleanupTimer?: NodeJS.Timeout;
  private isCleaning = false;

  async onApplicationBootstrap() {
    console.log('Resetting all users online status to offline on startup...');
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ isOnline: false })
      .execute();

    const cleanupInterval = Number(
      process.env.MESSAGE_CLEANUP_INTERVAL || 5000,
    );
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredMessages(),
      cleanupInterval,
    );
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private async cleanupExpiredMessages() {
    if (this.isCleaning) return;
    this.isCleaning = true;
    try {
      const now = new Date();
      const expiredMessages = await this.messageRepo
        .createQueryBuilder('message')
        .innerJoinAndSelect('message.room', 'room')
        .where('message.expiresAt IS NOT NULL AND message.expiresAt <= :now', {
          now,
        })
        .getMany();

      if (expiredMessages.length > 0) {
        const ids = expiredMessages.map((m) => m.id);

        await this.messageRepo
          .createQueryBuilder()
          .delete()
          .from(Message)
          .where('id IN (:...ids)', { ids })
          .execute();

        console.log(
          `[Self-Destruct] Cleaned up ${ids.length} expired messages.`,
        );

        const roomGroups = new Map<string, number[]>();
        for (const msg of expiredMessages) {
          if (msg.room?.passcode) {
            const list = roomGroups.get(msg.room.passcode) || [];
            list.push(msg.id);
            roomGroups.set(msg.room.passcode, list);
          }
        }

        for (const [passcode, msgIds] of roomGroups.entries()) {
          this.server.to(passcode).emit('messagesExpired', { ids: msgIds });
        }
      }
    } catch (e) {
      console.error('Error during self-destruct messages cleanup', e);
    } finally {
      this.isCleaning = false;
    }
  }

  private users = new Map<
    string,
    {
      nickname: string;
      passcode: string;
      isPip?: boolean;
    }
  >();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    const userInfo = this.users.get(client.id);

    if (!userInfo) return;

    this.users.delete(client.id);

    // Yield microtask execution to handle fast socket reconnection
    await Promise.resolve();

    // Check if there's another active socket connected for the same user
    const isStillConnected = Array.from(this.users.values()).some(
      (info) =>
        info.nickname === userInfo.nickname &&
        info.passcode === userInfo.passcode,
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

    this.server.to(userInfo.passcode).emit('userOffline', {
      nickname: userInfo.nickname,
      lastSeen: new Date(),
    });

    this.server.to(userInfo.passcode).emit('userLeft', {
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
      try {
        room = this.roomRepo.create({
          passcode: data.passcode,
          roomName: `Room-${data.passcode}`,
        });

        room = await this.roomRepo.save(room);
      } catch (err: any) {
        if (err.code === '23505') {
          room = await this.roomRepo.findOne({
            where: { passcode: data.passcode },
          });
        } else {
          throw err;
        }
      }
    }

    if (!room) {
      return { success: false, message: 'Could not create or find room' };
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

    const roomPasscode = room.passcode.trim();
    const dataPasscode = data.passcode.trim();
    client.join(roomPasscode);
    client.join(dataPasscode);

    this.users.set(client.id, {
      nickname: data.nickname,
      passcode: roomPasscode,
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
    let session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) {
      if (data.passcode) {
        session = {
          nickname: data.nickname || 'User',
          passcode: data.passcode,
        };
        this.users.set(client.id, session);
        client.join(data.passcode);
      } else {
        return {
          success: false,
          message: 'Unauthorized connection details',
        };
      }
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

    const cleanedMessage = cleanInstagramMessage(data.message);

    const savedMessage = this.messageRepo.create({
      roomId: room.id,
      nickname: session.nickname,
      message: cleanedMessage,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileType: data.fileType ?? null,
      fileSize:
        typeof data.fileSize === 'string'
          ? parseInt(data.fileSize, 10)
          : (data.fileSize ?? null),
      expiresAt,
    });

    await this.messageRepo.save(savedMessage);

    const roomPasscode = room.passcode.trim();
    const dataPasscode = data.passcode.trim();
    client.join(roomPasscode);
    client.join(dataPasscode);

    const messagePayload = {
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
    };

    this.server
      .to(roomPasscode)
      .to(dataPasscode)
      .emit('newMessage', messagePayload);

    return {
      success: true,
    };
  }

  @SubscribeMessage('getMessages')
  async getMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: GetRoomDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) {
      return [];
    }

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
    const session = this.users.get(client.id);
    if (!session) return;

    const trimmedPasscode = (data.passcode || session.passcode).trim();
    client.to(trimmedPasscode).emit('userTyping', {
      nickname: session.nickname,
    });
  }

  @SubscribeMessage('stopTyping')
  stopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: TypingDto,
  ) {
    const session = this.users.get(client.id);
    if (!session) return;

    const trimmedPasscode = (data.passcode || session.passcode).trim();
    client.to(trimmedPasscode).emit('userStoppedTyping', {
      nickname: session.nickname,
    });
  }

  @SubscribeMessage('getUsers')
  async getUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: GetRoomDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) {
      client.emit('usersList', []);
      return;
    }

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
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[CallUser] ${session.nickname} is calling in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('userCalling', {
      callerName: session.nickname,
    });
  }

  @SubscribeMessage('acceptCall')
  acceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AcceptCallDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[AcceptCall] ${session.nickname} accepted the call in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('callAccepted', {
      receiverName: session.nickname,
    });
  }

  @SubscribeMessage('declineCall')
  declineCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeclineCallDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[DeclineCall] ${session.nickname} declined the call in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('callDeclined', {
      receiverName: session.nickname,
    });
  }

  @SubscribeMessage('webrtcOffer')
  webrtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcOfferDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[WebRTCOffer] Relaying WebRTC offer in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('webrtcOfferRelay', {
      offer: data.offer,
    });
  }

  @SubscribeMessage('webrtcAnswer')
  webrtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcAnswerDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[WebRTCAnswer] Relaying WebRTC answer in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('webrtcAnswerRelay', {
      answer: data.answer,
    });
  }

  @SubscribeMessage('webrtcCandidate')
  webrtcCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcCandidateDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(
      `[WebRTCCandidate] Relaying WebRTC ICE candidate in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('webrtcCandidateRelay', {
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('endCall')
  endCall(@ConnectedSocket() client: Socket, @MessageBody() data: EndCallDto) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    console.log(`[EndCall] Relaying endCall in room: ${data.passcode}`);
    client.to(data.passcode).emit('callEnded');
  }

  @SubscribeMessage('togglePip')
  togglePip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TogglePipDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    session.isPip = data.isPip;

    console.log(
      `[TogglePip] ${session.nickname} set PIP mode to ${data.isPip} in room: ${data.passcode}`,
    );
    client.to(data.passcode).emit('pipStateChanged', {
      nickname: session.nickname,
      isPip: data.isPip,
    });
  }

  @SubscribeMessage('editMessage')
  async editMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EditMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) return;

    const room = await this.roomRepo.findOne({
      where: { passcode: session.passcode },
    });
    if (!room) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId, roomId: room.id },
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

    const room = await this.roomRepo.findOne({
      where: { passcode: session.passcode },
    });
    if (!room) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId, roomId: room.id },
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

    const room = await this.roomRepo.findOne({
      where: { passcode: session.passcode },
    });
    if (!room) return;

    const msg = await this.messageRepo.findOne({
      where: { id: data.messageId, roomId: room.id },
    });
    if (!msg) return;

    const reactions = msg.reactions || {};
    const activeNickname = session.nickname;
    let reactionUsers = reactions[data.emoji] || [];

    if (reactionUsers.includes(activeNickname)) {
      reactionUsers = reactionUsers.filter((u) => u !== activeNickname);
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

  @SubscribeMessage('createStatus')
  async createStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateStatusDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode.trim())
      return { success: false };

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false };

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

    const status = this.statusRepo.create({
      nickname: session.nickname,
      roomId: room.id,
      type: data.type || 'text',
      content: data.content || null,
      mediaUrl: data.mediaUrl || null,
      bgColor: data.bgColor || null,
      fontStyle: data.fontStyle || null,
      viewers: [],
      expiresAt,
    });

    const savedStatus = await this.statusRepo.save(status);
    const roomPasscode = room.passcode.trim();
    const dataPasscode = data.passcode.trim();

    const statusPayload = {
      id: savedStatus.id,
      nickname: savedStatus.nickname,
      roomId: savedStatus.roomId,
      type: savedStatus.type,
      content: savedStatus.content,
      mediaUrl: savedStatus.mediaUrl,
      bgColor: savedStatus.bgColor,
      fontStyle: savedStatus.fontStyle,
      viewers: savedStatus.viewers || [],
      createdAt: savedStatus.createdAt,
      expiresAt: savedStatus.expiresAt,
    };

    this.server
      .to(roomPasscode)
      .to(dataPasscode)
      .emit('statusCreated', statusPayload);

    return { success: true, status: savedStatus };
  }

  @SubscribeMessage('getStatuses')
  async getStatuses(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetStatusesDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();

    const room = await this.roomRepo.findOne({
      where: { passcode: targetPasscode },
    });
    if (!room) return [];

    const now = new Date();
    const statuses = await this.statusRepo
      .createQueryBuilder('status')
      .where('status.roomId = :roomId', { roomId: room.id })
      .andWhere('(status.expiresAt IS NULL OR status.expiresAt > :now)', {
        now,
      })
      .orderBy('status.createdAt', 'ASC')
      .getMany();

    client.emit('statusesList', statuses);
    return statuses;
  }

  @SubscribeMessage('viewStatus')
  async viewStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ViewStatusDto,
  ) {
    const session = this.users.get(client.id);
    if (!session) return;

    const status = await this.statusRepo.findOne({
      where: { id: data.statusId },
    });
    if (!status) return;

    let viewers = status.viewers || [];
    if (!viewers.includes(session.nickname)) {
      viewers = [...viewers, session.nickname];
      status.viewers = viewers;
      await this.statusRepo.save(status);
    }

    const trimmedPasscode = (data.passcode || session.passcode).trim();
    this.server.to(trimmedPasscode).emit('statusViewed', {
      statusId: status.id,
      viewers: status.viewers,
    });
  }

  @SubscribeMessage('deleteStatus')
  async deleteStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteStatusDto,
  ) {
    const session = this.users.get(client.id);
    if (!session) return;

    const status = await this.statusRepo.findOne({
      where: { id: data.statusId },
    });
    if (!status) return;

    if (status.nickname !== session.nickname) {
      return; // Unauthorized delete attempt
    }

    await this.statusRepo.remove(status);

    const trimmedPasscode = (data.passcode || session.passcode).trim();
    this.server.to(trimmedPasscode).emit('statusDeleted', {
      statusId: data.statusId,
    });
  }
}

function cleanInstagramMessage(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const instaUrlRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)[^\s]*/gi;
  const instaUrls = text.match(instaUrlRegex);

  const boilerplateRegex =
    /^(view profile|view profile on instagram|view more on instagram|view post on instagram|add a comment \.\.\.|add a comment\.\.\.|watch on instagram|watch again|watch reel|open instagram|view profile\.\.\.)$/i;

  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  const hasBoilerplateOrUrl =
    /view profile|view more on instagram|add a comment/i.test(text) ||
    instaUrls !== null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (boilerplateRegex.test(line)) continue;

    const lowerLine = line.toLowerCase();
    if (
      lowerLine === 'view profile' ||
      lowerLine === 'view profile on instagram' ||
      lowerLine === 'view more on instagram' ||
      lowerLine.startsWith('add a comment')
    ) {
      continue;
    }

    if (hasBoilerplateOrUrl) {
      if (
        line.includes('·') ||
        line.includes(' - Remix') ||
        lowerLine.includes('original audio')
      ) {
        continue;
      }

      const isAdjacentToBoilerplate = lines.some(
        (l, idx) => Math.abs(idx - i) <= 3 && boilerplateRegex.test(l.trim()),
      );
      const isUrl = line.match(
        /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)/i,
      );

      if (isAdjacentToBoilerplate && !isUrl) {
        if (
          /^[a-zA-Z0-9_.]+$|^[a-zA-Z0-9_., -]+ \. [a-zA-Z0-9_., -]+$/i.test(
            line,
          )
        ) {
          continue;
        }
      }
    }

    cleanedLines.push(line);
  }

  const cleanedText = cleanedLines.join('\n').trim();

  if (!cleanedText && instaUrls && instaUrls.length > 0) {
    return instaUrls[0];
  }

  if (
    cleanedText &&
    instaUrls &&
    instaUrls.length > 0 &&
    !cleanedText.includes(instaUrls[0])
  ) {
    return `${cleanedText}\n${instaUrls[0]}`.trim();
  }

  return cleanedText || (instaUrls ? instaUrls[0] : text);
}
