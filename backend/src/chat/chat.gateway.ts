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
  PinMessageDto,
  MarkReadDto,
  VotePollDto,
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
  ScreenShareStatusDto,
} from './dto/call-signal.dto';
import {
  CreateStatusDto,
  GetStatusesDto,
  ViewStatusDto,
  DeleteStatusDto,
} from './dto/status.dto';
import {
  WatchPartyActionDto,
  GetWatchPartyDto,
  WatchPartyReactionDto,
  WatchPartyCommentDto,
} from './dto/watch-party.dto';
import { UpdateRoomWallpaperDto } from './dto/room-wallpaper.dto';

interface WatchPartyState {
  isActive: boolean;
  videoSource: {
    url: string;
    title: string;
    type?: 'direct' | 'youtube';
    duration?: number;
  } | null;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  lastUpdatedTimestamp: number;
  lastActorNickname: string;
  isBuffering: boolean;
  bufferingUsers: string[];
}

export interface ActiveCallSession {
  callId: string;
  room: string;
  callerSocketId: string;
  callerNickname: string;
  calleeSocketId?: string;
  calleeNickname?: string;
  isVoiceOnly?: boolean;
  state: 'calling' | 'active' | 'ended';
  startedAt: number;
  ringTimer?: any;
}

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : '*',
  },
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL || 25000),
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT || 20000),
  maxHttpBufferSize: 1e7,
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
    try {
      console.log('Resetting all users online status to offline on startup...');
      await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({ isOnline: false })
        .execute();
    } catch {
      console.log('User status reset skipped during startup');
    }

    const cleanupInterval = Number(
      process.env.MESSAGE_CLEANUP_INTERVAL || 30000,
    );
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredMessages();
    }, cleanupInterval);
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

      // Also prune expired 24h status stories to keep database clean
      try {
        await this.statusRepo
          .createQueryBuilder()
          .delete()
          .from(Status)
          .where('expiresAt IS NOT NULL AND expiresAt <= :now', { now })
          .execute();
      } catch {
        // Non-critical if table is not yet initialized
      }
    } catch (e: any) {
      if (e?.code === '42P01') {
        console.warn('[Self-Destruct] Table "messages" does not exist yet.');
      } else {
        console.error('Error during self-destruct messages cleanup', e);
      }
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

  private socketMessageTimes = new Map<string, number[]>();

  private watchPartyRooms = new Map<string, WatchPartyState>();

  private roomWallpapers = new Map<
    string,
    {
      theme: string;
      customWallpaper: string | null;
    }
  >();

  private activeCallSessions = new Map<string, ActiveCallSession>();
  private callDisconnectTimers = new Map<string, NodeJS.Timeout>();

  private clearCallDisconnectTimer(callId: string) {
    const timer = this.callDisconnectTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.callDisconnectTimers.delete(callId);
    }
  }

  private findCallBySocketId(socketId: string): ActiveCallSession | undefined {
    for (const session of this.activeCallSessions.values()) {
      if (
        session.callerSocketId === socketId ||
        session.calleeSocketId === socketId
      ) {
        return session;
      }
    }
    return undefined;
  }

  private findSocketInRoom(
    passcode: string,
    nickname?: string,
    excludeSocketId?: string,
  ): { socketId: string; nickname: string } | undefined {
    const cleanPass = passcode.trim();
    for (const [id, user] of this.users.entries()) {
      if (user.passcode.trim() === cleanPass && id !== excludeSocketId) {
        if (
          !nickname ||
          user.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          return { socketId: id, nickname: user.nickname };
        }
      }
    }
    return undefined;
  }

  private getCalculatedWatchPartyPosition(state: WatchPartyState): number {
    if (!state.isPlaying || state.isBuffering) {
      return state.currentTime;
    }
    const elapsedSec =
      ((Date.now() - state.lastUpdatedTimestamp) / 1000) *
      (state.playbackRate || 1);
    const calculated = state.currentTime + elapsedSec;
    if (
      state.videoSource?.duration &&
      calculated > state.videoSource.duration
    ) {
      return state.videoSource.duration;
    }
    return Math.max(0, calculated);
  }

  private checkRateLimit(
    client: Socket,
    maxLimit = 15,
    windowMs = 3000,
  ): boolean {
    const now = Date.now();
    const timestamps = (this.socketMessageTimes.get(client.id) || []).filter(
      (t) => now - t < windowMs,
    );
    if (timestamps.length >= maxLimit) {
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
      });
      return false;
    }
    timestamps.push(now);
    this.socketMessageTimes.set(client.id, timestamps);
    return true;
  }

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    this.socketMessageTimes.delete(client.id);
    const userInfo = this.users.get(client.id);

    if (!userInfo) return;

    // Handle active or pending call for this disconnecting socket with a grace period
    const existingCall = this.findCallBySocketId(client.id);
    if (existingCall) {
      if (existingCall.state === 'calling') {
        // If still ringing and unanswered, end the ringing call immediately
        if (existingCall.ringTimer) {
          clearTimeout(existingCall.ringTimer);
        }
        this.clearCallDisconnectTimer(existingCall.callId);
        this.activeCallSessions.delete(existingCall.callId);

        const peerSocketId =
          existingCall.callerSocketId === client.id
            ? existingCall.calleeSocketId
            : existingCall.callerSocketId;

        if (peerSocketId) {
          this.server.to(peerSocketId).emit('callEnded', {
            reason: 'Call cancelled: participant disconnected',
            from: userInfo.nickname,
            callId: existingCall.callId,
          });
        }
      } else if (existingCall.state === 'active') {
        // Active call in progress: grant a 12-second grace period for the socket to reconnect!
        // During WebRTC video calls, high CPU/network jitter can momentarily drop the socket
        // while UDP media tracks stay alive. Do NOT kill the call immediately!
        console.log(
          `[CallGracePeriod] Socket ${client.id} (${userInfo.nickname}) disconnected during active call ${existingCall.callId}. Starting 12s grace period.`,
        );

        const peerSocketId =
          existingCall.callerSocketId === client.id
            ? existingCall.calleeSocketId
            : existingCall.callerSocketId;

        if (peerSocketId) {
          this.server.to(peerSocketId).emit('peerReconnecting', {
            nickname: userInfo.nickname,
            callId: existingCall.callId,
          });
        }

        const callId = existingCall.callId;
        this.clearCallDisconnectTimer(callId);

        const timer = setTimeout(() => {
          this.callDisconnectTimers.delete(callId);
          const currentCall = this.activeCallSessions.get(callId);
          if (currentCall && currentCall.state === 'active') {
            console.log(
              `[CallGracePeriod] Grace period expired for call ${callId}. Ending call.`,
            );
            this.activeCallSessions.delete(callId);
            const remainingPeer =
              currentCall.callerSocketId === client.id
                ? currentCall.calleeSocketId
                : currentCall.callerSocketId;

            if (remainingPeer) {
              this.server.to(remainingPeer).emit('callEnded', {
                reason: 'Call ended: participant disconnected',
                from: userInfo.nickname,
                callId,
              });
            }
            if (currentCall.room) {
              this.server.to(currentCall.room).emit('callEnded', {
                reason: 'Call ended: participant disconnected',
                from: userInfo.nickname,
                callId,
              });
            }
          }
        }, 12000);

        this.callDisconnectTimers.set(callId, timer);
      }
    }

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
          networkLabel: user.networkLabel,
          batteryLabel: user.batteryLabel,
          batteryIsCharging: user.batteryIsCharging,
        })),
      );
    }

    this.server.to(userInfo.passcode).emit('userStoppedTyping', {
      nickname: userInfo.nickname,
    });
    this.server.to(userInfo.passcode).emit('userStopTyping', {
      nickname: userInfo.nickname,
    });

    this.server.to(userInfo.passcode).emit('userOffline', {
      nickname: userInfo.nickname,
      lastSeen: new Date(),
    });

    this.server.to(userInfo.passcode).emit('userLeft', {
      nickname: userInfo.nickname,
    });

    // Clean up in-memory Watch Party state if no users remain in this room
    const anyUserInRoom = Array.from(this.users.values()).some(
      (info) => info.passcode === userInfo.passcode,
    );
    if (!anyUserInRoom) {
      this.watchPartyRooms.delete(userInfo.passcode);
    }
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
        networkLabel: data.networkLabel,
        batteryLabel: data.batteryLabel,
        batteryIsCharging: Boolean(data.batteryIsCharging),
      });
    } else {
      user.isOnline = true;
      user.lastSeen = null;
      user.deviceType = data.deviceType || user.deviceType;
      user.deviceModel = data.deviceModel || user.deviceModel;
      user.browser = data.browser || user.browser;
      user.os = data.os || user.os;
      if (data.networkLabel) {
        user.networkLabel = data.networkLabel;
      }
      if (data.batteryLabel) {
        user.batteryLabel = data.batteryLabel;
      }
      if (typeof data.batteryIsCharging === 'boolean') {
        user.batteryIsCharging = data.batteryIsCharging;
      }
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

    // Re-bind reconnecting user to any active call session in this room
    for (const session of this.activeCallSessions.values()) {
      if (session.room === roomPasscode && session.state === 'active') {
        let reconnected = false;
        let peerId: string | undefined;

        if (session.callerNickname === data.nickname) {
          session.callerSocketId = client.id;
          peerId = session.calleeSocketId;
          reconnected = true;
        } else if (session.calleeNickname === data.nickname) {
          session.calleeSocketId = client.id;
          peerId = session.callerSocketId;
          reconnected = true;
        }

        if (reconnected) {
          console.log(
            `[CallReconnected] ${data.nickname} reconnected to active call ${session.callId} with socket ${client.id}`,
          );
          this.clearCallDisconnectTimer(session.callId);

          if (peerId) {
            this.server.to(peerId).emit('peerReconnected', {
              nickname: data.nickname,
              callId: session.callId,
              socketId: client.id,
            });
          }
          client.emit('callRestored', {
            callId: session.callId,
            targetSocketId: peerId,
            isVoiceOnly: session.isVoiceOnly,
          });
        }
      }
    }

    const messages = await this.messageRepo.find({
      where: {
        roomId: room.id,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    client.emit('chatHistory', messages);

    // Sync room-wide shared theme & wallpaper
    const activeWallpaper = this.roomWallpapers.get(roomPasscode) || {
      theme: room.theme || 'wa-doodle',
      customWallpaper: room.customWallpaper || null,
    };
    if (!this.roomWallpapers.has(roomPasscode)) {
      this.roomWallpapers.set(roomPasscode, activeWallpaper);
    }
    const isRoomDefault =
      !activeWallpaper.customWallpaper &&
      (activeWallpaper.theme === 'wa-doodle' || !activeWallpaper.theme);
    client.emit('roomWallpaperSync', {
      theme: activeWallpaper.theme,
      customWallpaper: activeWallpaper.customWallpaper,
      isDefault: isRoomDefault,
    });

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
        networkLabel: user.networkLabel,
        batteryLabel: user.batteryLabel,
        batteryIsCharging: user.batteryIsCharging,
      })),
    );

    this.server.to(room.passcode).emit('userOnline', {
      nickname: data.nickname,
    });

    this.server.to(room.passcode).emit('userJoined', {
      nickname: data.nickname,
    });

    const now = new Date();
    const activeStatuses = await this.statusRepo
      .createQueryBuilder('status')
      .where('status.roomId = :roomId', { roomId: room.id })
      .andWhere('(status.expiresAt IS NULL OR status.expiresAt > :now)', {
        now,
      })
      .orderBy('status.createdAt', 'ASC')
      .getMany();

    client.emit('statusesList', activeStatuses);
    client.emit('statusesUpdated', activeStatuses);

    // Send active pinned message if room has one
    if (room.pinnedMessageId) {
      const pinnedMsg = await this.messageRepo.findOne({
        where: { id: room.pinnedMessageId, roomId: room.id },
      });
      client.emit('pinnedMessageUpdated', pinnedMsg || null);
    }

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
    if (!this.checkRateLimit(client, 10, 3000)) {
      return { success: false, message: 'Rate limit exceeded' };
    }

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

    const savedMessage = this.messageRepo.create({
      roomId: room.id,
      nickname: session.nickname,
      message: data.message,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileType: data.fileType ?? null,
      fileSize:
        typeof data.fileSize === 'string'
          ? parseInt(data.fileSize, 10)
          : (data.fileSize ?? null),
      isVoiceNote: Boolean(data.isVoiceNote),
      isVideoNote: Boolean(data.isVideoNote),
      isWithoutSound: Boolean(data.isWithoutSound),
      expiresAt,
      pollData: data.pollData ?? null,
      locationData: data.locationData ?? null,
      readBy: [session.nickname],
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
      isVoiceNote: savedMessage.isVoiceNote,
      isVideoNote: savedMessage.isVideoNote,
      isWithoutSound: savedMessage.isWithoutSound,
      isEdited: savedMessage.isEdited,
      isDeleted: savedMessage.isDeleted,
      reactions: savedMessage.reactions,
      expiresAt: savedMessage.expiresAt,
      pollData: savedMessage.pollData,
      locationData: savedMessage.locationData,
      readBy: savedMessage.readBy || [savedMessage.nickname],
    };

    this.server
      .to(roomPasscode)
      .to(dataPasscode)
      .emit('newMessage', messagePayload);

    return {
      success: true,
    };
  }

  @SubscribeMessage('markRead')
  async markRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: MarkReadDto,
  ) {
    if (!payload || !payload.messageIds || !payload.messageIds.length) {
      return { success: false };
    }
    const session = this.users.get(client.id);
    const reader = payload.nickname || session?.nickname;
    if (!reader) return { success: false };

    const messages = await this.messageRepo.find({
      where: payload.messageIds.map((id) => ({ id })),
    });

    const updatedMessages: Message[] = [];
    const updatedMessageIds: number[] = [];
    for (const msg of messages) {
      const currentReadBy = Array.isArray(msg.readBy)
        ? msg.readBy
        : [msg.nickname];
      if (!currentReadBy.includes(reader)) {
        msg.readBy = [...currentReadBy, reader];
        updatedMessages.push(msg);
        updatedMessageIds.push(msg.id);
      }
    }
    if (updatedMessages.length > 0) {
      await this.messageRepo.save(updatedMessages);
    }

    const roomPasscode = (payload.passcode || session?.passcode || '').trim();
    if (updatedMessageIds.length > 0 && roomPasscode) {
      this.server.to(roomPasscode).emit('messagesRead', {
        messageIds: updatedMessageIds,
        readByNick: reader,
      });
    }

    return { success: true, updatedCount: updatedMessageIds.length };
  }

  @SubscribeMessage('votePoll')
  async votePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: VotePollDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (
      payload?.passcode ||
      session?.passcode ||
      ''
    ).trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized' };
    }

    const message = await this.messageRepo.findOne({
      where: { id: payload.messageId },
    });

    if (!message || !message.pollData) return { success: false };

    const voterNickname = session.nickname;
    const poll = message.pollData;
    if (poll.options && Array.isArray(poll.options)) {
      poll.options.forEach((opt: any) => {
        opt.votes = (opt.votes || []).filter(
          (nick: string) => nick !== voterNickname,
        );
        if (String(opt.id) === String(payload.optionId)) {
          opt.votes.push(voterNickname);
        }
      });
    }

    message.pollData = poll;
    await this.messageRepo.save(message);

    this.server.to(targetPasscode).emit('messageUpdated', {
      id: message.id,
      pollData: message.pollData,
    });

    return { success: true };
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
    client.to(trimmedPasscode).emit('userStopTyping', {
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
        networkLabel: user.networkLabel,
        batteryLabel: user.batteryLabel,
        batteryIsCharging: user.batteryIsCharging,
      })),
    );
  }

  @SubscribeMessage('callUser')
  callUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallUserDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();

    // Clean up any stale call sessions previously initiated by this socket
    const prevCall = this.findCallBySocketId(client.id);
    if (prevCall) {
      if (prevCall.ringTimer) clearTimeout(prevCall.ringTimer);
      this.activeCallSessions.delete(prevCall.callId);
    }

    // Resolve target socket (explicit socket ID, targeted nickname, or other participant in 2-person room)
    const target = data.targetSocketId
      ? { socketId: data.targetSocketId, nickname: data.targetNickname || 'Participant' }
      : this.findSocketInRoom(room, data.targetNickname, client.id);

    // If target nickname was specified but no matching online user was found
    if (data.targetNickname && !target) {
      client.emit('callError', {
        message: `${data.targetNickname} is currently offline.`,
      });
      return;
    }

    // Check if target is already in an active call
    if (target) {
      const targetActiveCall = this.findCallBySocketId(target.socketId);
      if (targetActiveCall && targetActiveCall.state === 'active') {
        client.emit('callBusy', {
          nickname: target.nickname,
          reason: 'User is currently on another call.',
        });
        return;
      }
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCallSession: ActiveCallSession = {
      callId,
      room,
      callerSocketId: client.id,
      callerNickname: session.nickname,
      calleeSocketId: target?.socketId,
      calleeNickname: target?.nickname,
      isVoiceOnly: Boolean(data.isVoiceOnly),
      state: 'calling',
      startedAt: Date.now(),
    };

    // Auto-timeout ring timer (35 seconds)
    newCallSession.ringTimer = setTimeout(() => {
      const active = this.activeCallSessions.get(callId);
      if (active && active.state === 'calling') {
        this.activeCallSessions.delete(callId);
        this.server.to(active.callerSocketId).emit('callTimeout', {
          reason: 'No answer. Call timed out.',
          callId,
        });
        if (active.calleeSocketId) {
          this.server.to(active.calleeSocketId).emit('callMissed', {
            callerName: active.callerNickname,
            callId,
          });
        }
      }
    }, 35000);

    this.activeCallSessions.set(callId, newCallSession);

    const callPayload = {
      callerName: data.callerName || session.nickname,
      from: session.nickname,
      callerSocketId: client.id,
      targetSocketId: target?.socketId,
      isVoiceOnly: Boolean(data.isVoiceOnly),
      callId,
    };

    console.log(
      `[CallUser] ${session.nickname} calling ${target ? target.nickname : 'room'} (callId: ${callId}) in room: ${room}`,
    );

    if (target?.socketId) {
      this.server.to(target.socketId).emit('userCalling', callPayload);
      this.server.to(target.socketId).emit('callUser', callPayload);
    } else {
      client.to(room).emit('userCalling', callPayload);
      client.to(room).emit('callUser', callPayload);
    }
  }

  @SubscribeMessage('acceptCall')
  acceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AcceptCallDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();

    // Find call session
    const callSession =
      (data.callId && this.activeCallSessions.get(data.callId)) ||
      this.findCallBySocketId(client.id) ||
      Array.from(this.activeCallSessions.values()).find(
        (c) => c.room === room && c.state === 'calling',
      );

    if (callSession) {
      if (callSession.ringTimer) {
        clearTimeout(callSession.ringTimer);
        callSession.ringTimer = undefined;
      }
      callSession.state = 'active';
      callSession.calleeSocketId = client.id;
      callSession.calleeNickname = session.nickname;
    }

    console.log(
      `[AcceptCall] ${session.nickname} accepted call in room: ${room}`,
    );

    const acceptPayload = {
      receiverName: data.receiverName || session.nickname,
      from: session.nickname,
      receiverSocketId: client.id,
      callId: callSession?.callId,
    };

    if (callSession?.callerSocketId) {
      this.server.to(callSession.callerSocketId).emit('callAccepted', acceptPayload);
      this.server.to(callSession.callerSocketId).emit('acceptCall', acceptPayload);
    } else if (data.targetSocketId) {
      this.server.to(data.targetSocketId).emit('callAccepted', acceptPayload);
      this.server.to(data.targetSocketId).emit('acceptCall', acceptPayload);
    }
    client.to(room).emit('callAccepted', acceptPayload);
    client.to(room).emit('acceptCall', acceptPayload);
  }

  @SubscribeMessage('declineCall')
  declineCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeclineCallDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    console.log(
      `[DeclineCall] ${session.nickname} declined the call in room: ${room}`,
    );

    const callSession = this.findCallBySocketId(client.id);
    if (callSession) {
      if (callSession.ringTimer) clearTimeout(callSession.ringTimer);
      this.clearCallDisconnectTimer(callSession.callId);
      this.activeCallSessions.delete(callSession.callId);
    }

    const declinePayload = {
      receiverName: data.receiverName || session.nickname,
      from: session.nickname,
      reason: data.reason || 'Call declined',
      callId: callSession?.callId,
    };

    if (callSession?.callerSocketId) {
      this.server.to(callSession.callerSocketId).emit('callDeclined', declinePayload);
      this.server.to(callSession.callerSocketId).emit('declineCall', declinePayload);
    } else if (data.targetSocketId) {
      this.server.to(data.targetSocketId).emit('callDeclined', declinePayload);
      this.server.to(data.targetSocketId).emit('declineCall', declinePayload);
    }
    client.to(room).emit('callDeclined', declinePayload);
    client.to(room).emit('declineCall', declinePayload);
  }

  @SubscribeMessage('webrtcOffer')
  webrtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcOfferDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    console.log(
      `[WebRTCOffer] Relaying WebRTC offer from ${session.nickname} in room: ${room}`,
    );

    const callSession = this.findCallBySocketId(client.id);

    const offerPayload = {
      offer: data.offer,
      from: session.nickname,
      callerName: data.callerName || session.nickname,
      callerSocketId: client.id,
      callId: callSession?.callId,
    };

    const targetSocketId =
      data.targetSocketId ||
      (callSession && callSession.callerSocketId === client.id ? callSession.calleeSocketId : undefined);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtcOffer', offerPayload);
    } else {
      client.to(room).emit('webrtcOffer', offerPayload);
    }
  }

  @SubscribeMessage('webrtcAnswer')
  webrtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcAnswerDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    console.log(
      `[WebRTCAnswer] Relaying WebRTC answer from ${session.nickname} in room: ${room}`,
    );

    const callSession = this.findCallBySocketId(client.id);

    const answerPayload = {
      answer: data.answer,
      from: session.nickname,
      receiverName: data.receiverName || session.nickname,
      receiverSocketId: client.id,
      callId: callSession?.callId,
    };

    const targetSocketId =
      data.targetSocketId ||
      (callSession && callSession.calleeSocketId === client.id ? callSession.callerSocketId : undefined);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtcAnswer', answerPayload);
      this.server.to(targetSocketId).emit('callAccepted', {
        receiverName: data.receiverName || session.nickname,
        from: session.nickname,
      });
    } else {
      client.to(room).emit('webrtcAnswer', answerPayload);
      client.to(room).emit('callAccepted', {
        receiverName: data.receiverName || session.nickname,
        from: session.nickname,
      });
    }
  }

  @SubscribeMessage('webrtcCandidate')
  webrtcCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcCandidateDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    const candidatePayload = {
      candidate: data.candidate,
      fromSocketId: client.id,
    };

    const callSession = this.findCallBySocketId(client.id);
    const targetSocketId =
      data.targetSocketId ||
      (callSession
        ? callSession.callerSocketId === client.id
          ? callSession.calleeSocketId
          : callSession.callerSocketId
        : undefined);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtcCandidate', candidatePayload);
    } else {
      client.to(room).emit('webrtcCandidate', candidatePayload);
    }
  }

  @SubscribeMessage('endCall')
  endCall(@ConnectedSocket() client: Socket, @MessageBody() data: EndCallDto) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    console.log(`[EndCall] Relaying endCall in room: ${room}`);

    const callSession = this.findCallBySocketId(client.id);
    if (callSession) {
      if (callSession.ringTimer) clearTimeout(callSession.ringTimer);
      this.clearCallDisconnectTimer(callSession.callId);
      this.activeCallSessions.delete(callSession.callId);

      const peerSocketId =
        callSession.callerSocketId === client.id
          ? callSession.calleeSocketId
          : callSession.callerSocketId;

      if (peerSocketId) {
        this.server.to(peerSocketId).emit('callEnded', {
          reason: data.reason || 'Call ended by participant',
          from: session.nickname,
          callId: callSession.callId,
        });
        this.server.to(peerSocketId).emit('endCall', {
          reason: data.reason || 'Call ended by participant',
          from: session.nickname,
          callId: callSession.callId,
        });
      }
    }

    client.to(room).emit('callEnded', {
      reason: data.reason || 'Call ended',
      from: session.nickname,
    });
    client.to(room).emit('endCall', {
      reason: data.reason || 'Call ended',
      from: session.nickname,
    });
  }

  @SubscribeMessage('getIceServers')
  getIceServers(@ConnectedSocket() client: Socket) {
    const stunServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const turnUrl = process.env.TURN_SERVER_URL;
    const turnSecret = process.env.TURN_SECRET;
    const session = this.users.get(client.id);

    const iceServers: any[] = [...stunServers];

    if (turnUrl && turnSecret && session) {
      try {
        const ttl = 86400;
        const timestamp = Math.floor(Date.now() / 1000) + ttl;
        const username = `${timestamp}:${session.nickname}`;
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha1', turnSecret);
        hmac.update(username);
        const credential = hmac.digest('base64');

        iceServers.push({
          urls: turnUrl.split(',').map((u) => u.trim()),
          username,
          credential,
        });
      } catch (err) {
        console.warn('Failed generating dynamic HMAC TURN credential:', err);
      }
    } else {
      iceServers.push({
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelay',
        credential: 'openrelay',
      });
    }

    client.emit('iceServers', { iceServers });
  }

  @SubscribeMessage('clientPing')
  clientPing(@ConnectedSocket() client: Socket) {
    return { success: true, timestamp: Date.now() };
  }

  @SubscribeMessage('togglePip')
  togglePip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TogglePipDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    session.isPip = data.isPip;
    const room = session.passcode.trim();

    console.log(
      `[TogglePip] ${session.nickname} set PIP mode to ${data.isPip} in room: ${room}`,
    );
    client.to(room).emit('pipStateChanged', {
      nickname: session.nickname,
      isPip: data.isPip,
    });
  }

  @SubscribeMessage('screenShareStatus')
  screenShareStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ScreenShareStatusDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    console.log(
      `[ScreenShareStatus] ${session.nickname} screen sharing: ${data.isSharing} in room: ${room}`,
    );
    client.to(room).emit('screenShareStatus', {
      isSharing: data.isSharing,
      from: session.nickname,
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

    const updatedPayload = {
      id: msg.id,
      messageId: msg.id,
      newMessage: msg.message,
      message: msg.message,
      fileUrl: msg.fileUrl,
      isEdited: true,
    };

    this.server.to(data.passcode).emit('messageEdited', updatedPayload);
    this.server.to(data.passcode).emit('messageUpdated', updatedPayload);
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

    // If this was the pinned message, reset room pinnedMessageId
    if (room.pinnedMessageId === msg.id) {
      room.pinnedMessageId = null;
      await this.roomRepo.save(room);
      this.server.to(data.passcode).emit('pinnedMessageUpdated', null);
    }

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
    const targetPasscode = (data?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: targetPasscode },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const user = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!user) return { success: false, message: 'User not verified in room' };

    await this.messageRepo.delete({ roomId: room.id });

    // Clear pinned message in room
    room.pinnedMessageId = null;
    await this.roomRepo.save(room);

    console.log(
      `[ClearHistory] Room ${targetPasscode} history cleared by user ${session.nickname}`,
    );

    this.server.to(targetPasscode).emit('historyCleared');
    this.server.to(targetPasscode).emit('pinnedMessageUpdated', null);
    return { success: true };
  }

  @SubscribeMessage('pinMessage')
  async pinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PinMessageDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: targetPasscode },
    });
    if (!room) return { success: false, message: 'Room not found' };

    let pinnedMsg: Message | null = null;
    if (data.messageId) {
      pinnedMsg = await this.messageRepo.findOne({
        where: { id: data.messageId, roomId: room.id },
      });
      if (!pinnedMsg) {
        return { success: false, message: 'Message not found' };
      }
      room.pinnedMessageId = pinnedMsg.id;
    } else {
      room.pinnedMessageId = null;
    }

    await this.roomRepo.save(room);

    this.server.to(targetPasscode).emit('pinnedMessageUpdated', pinnedMsg);
    return { success: true, pinnedMessage: pinnedMsg };
  }

  @SubscribeMessage('reactToMessage')
  async reactToMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactToMessageDto,
  ) {
    const session = this.users.get(client.id);
    if (!session) return;
    if (
      session.passcode.trim().toLowerCase() !==
      (data.passcode || '').trim().toLowerCase()
    )
      return;

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
    this.server.to(data.passcode).emit('messageReaction', {
      messageId: msg.id,
      reactions: msg.reactions,
    });
  }

  @SubscribeMessage('reactMessage')
  async reactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactToMessageDto,
  ) {
    return this.reactToMessage(client, data);
  }

  @SubscribeMessage('createStatus')
  async createStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateStatusDto,
  ) {
    if (!this.checkRateLimit(client, 5, 5000)) {
      return { success: false, message: 'Rate limit exceeded' };
    }

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
      stickers: data.stickers || null,
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
      stickers: savedStatus.stickers || null,
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

  @SubscribeMessage('watchPartyAction')
  handleWatchPartyAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WatchPartyActionDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized session' };
    }

    let state = this.watchPartyRooms.get(targetPasscode);
    const now = Date.now();

    if (!state) {
      state = {
        isActive: true,
        videoSource: data.videoSource || null,
        currentTime: data.currentTime || 0,
        isPlaying: Boolean(data.isPlaying),
        playbackRate: data.playbackRate || 1,
        lastUpdatedTimestamp: now,
        lastActorNickname: session.nickname,
        isBuffering: false,
        bufferingUsers: [],
      };
      this.watchPartyRooms.set(targetPasscode, state);
    }

    const currentPos = this.getCalculatedWatchPartyPosition(state);

    switch (data.action) {
      case 'open':
      case 'invite':
        state.isActive = true;
        if (data.videoSource) state.videoSource = data.videoSource;
        if (data.currentTime !== undefined)
          state.currentTime = data.currentTime;
        state.lastActorNickname = session.nickname;
        state.lastUpdatedTimestamp = now;
        // Notify other participant(s) in the room with an invitation popup
        client.to(targetPasscode).emit('watchPartyInvite', {
          from: session.nickname,
          videoSource: state.videoSource,
          timestamp: now,
        });
        break;

      case 'accept':
        state.isActive = true;
        state.isPlaying = true;
        state.currentTime =
          data.currentTime !== undefined
            ? data.currentTime
            : state.currentTime || 0;
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        this.server.to(targetPasscode).emit('watchPartyAccepted', {
          acceptedBy: session.nickname,
          videoSource: state.videoSource,
        });
        break;

      case 'decline':
        client.to(targetPasscode).emit('watchPartyDeclined', {
          declinedBy: session.nickname,
        });
        return { success: true };

      case 'play':
        state.isPlaying = true;
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        break;

      case 'pause':
        state.isPlaying = false;
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        break;

      case 'seek':
        state.currentTime =
          data.currentTime !== undefined ? Math.max(0, data.currentTime) : 0;
        if (data.isPlaying !== undefined) {
          state.isPlaying = data.isPlaying;
        }
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        break;

      case 'rate':
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.playbackRate = data.playbackRate || 1;
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        break;

      case 'change_video':
        state.videoSource = data.videoSource || null;
        state.currentTime = 0;
        state.isPlaying = false;
        state.playbackRate = 1;
        state.lastUpdatedTimestamp = now;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        state.isActive = true;
        break;

      case 'buffering':
        if (!state.bufferingUsers.includes(session.nickname)) {
          state.bufferingUsers.push(session.nickname);
        }
        state.isBuffering = true;
        state.currentTime = currentPos;
        state.lastUpdatedTimestamp = now;
        break;

      case 'ready':
        state.bufferingUsers = state.bufferingUsers.filter(
          (u) => u !== session.nickname,
        );
        if (state.bufferingUsers.length === 0) {
          state.isBuffering = false;
          state.lastUpdatedTimestamp = now;
        }
        break;

      case 'close':
        state.isActive = false;
        state.isPlaying = false;
        this.watchPartyRooms.delete(targetPasscode);
        this.server.to(targetPasscode).emit('watchPartyClosed', {
          closedBy: session.nickname,
        });
        return { success: true };
    }

    const payload = {
      action: data.action,
      videoSource: state.videoSource,
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      playbackRate: state.playbackRate,
      isBuffering: state.isBuffering,
      bufferingUsers: state.bufferingUsers,
      lastUpdatedTimestamp: state.lastUpdatedTimestamp,
      lastActorNickname: session.nickname,
      serverTime: now,
    };

    // Broadcast synchronized state to everyone in the room
    this.server.to(targetPasscode).emit('watchPartyUpdate', payload);
    return { success: true, state: payload };
  }

  @SubscribeMessage('getWatchPartyState')
  getWatchPartyState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetWatchPartyDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized session' };
    }

    const state = this.watchPartyRooms.get(targetPasscode);
    if (!state || !state.isActive) {
      client.emit('watchPartyState', null);
      return { success: true, state: null };
    }

    const calculatedTime = this.getCalculatedWatchPartyPosition(state);
    const payload = {
      action: 'sync',
      videoSource: state.videoSource,
      currentTime: calculatedTime,
      isPlaying: state.isPlaying,
      playbackRate: state.playbackRate,
      isBuffering: state.isBuffering,
      bufferingUsers: state.bufferingUsers,
      lastUpdatedTimestamp: state.lastUpdatedTimestamp,
      lastActorNickname: state.lastActorNickname,
      serverTime: Date.now(),
    };

    client.emit('watchPartyState', payload);
    return { success: true, state: payload };
  }

  @SubscribeMessage('watchPartyReaction')
  watchPartyReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WatchPartyReactionDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return;
    }

    this.server.to(targetPasscode).emit('watchPartyReaction', {
      from: session.nickname,
      reaction: data.reaction,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('watchPartyComment')
  watchPartyComment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WatchPartyCommentDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return;
    }

    this.server.to(targetPasscode).emit('watchPartyComment', {
      id: `${Date.now()}-${Math.random()}`,
      from: session.nickname,
      text: data.text,
      top:
        typeof data.top === 'number'
          ? data.top
          : Math.floor(Math.random() * 60) + 15,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('updateRoomWallpaper')
  async updateRoomWallpaper(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateRoomWallpaperDto,
  ) {
    const session = this.users.get(client.id);
    const targetPasscode = (data?.passcode || session?.passcode || '').trim();
    if (
      !session ||
      !targetPasscode ||
      session.passcode.trim() !== targetPasscode
    ) {
      return { success: false, message: 'Unauthorized session' };
    }

    const currentCached = this.roomWallpapers.get(targetPasscode) || {
      theme: 'wa-doodle',
      customWallpaper: null,
    };

    const newTheme =
      data.theme !== undefined && data.theme !== null
        ? data.theme
        : currentCached.theme;

    const newWallpaper =
      data.customWallpaper !== undefined
        ? data.customWallpaper
        : currentCached.customWallpaper;

    const updatedState = {
      theme: newTheme,
      customWallpaper: newWallpaper,
    };
    this.roomWallpapers.set(targetPasscode, updatedState);

    try {
      let room = await this.roomRepo.findOne({
        where: { passcode: targetPasscode },
      });
      if (!room) {
        room = this.roomRepo.create({
          passcode: targetPasscode,
          roomName: `Room-${targetPasscode}`,
        });
      }
      room.theme = newTheme;
      room.customWallpaper = newWallpaper;
      await this.roomRepo.save(room);
    } catch (err) {
      console.warn(
        '[RoomWallpaper] Could not persist wallpaper to database:',
        err,
      );
    }

    // Broadcast synchronized wallpaper to all participants in this passcode room
    this.server.to(targetPasscode).emit('roomWallpaperUpdated', {
      theme: newTheme,
      customWallpaper: newWallpaper,
      updatedBy: session.nickname,
    });

    return {
      success: true,
      theme: newTheme,
      customWallpaper: newWallpaper,
      updatedBy: session.nickname,
    };
  }
}
