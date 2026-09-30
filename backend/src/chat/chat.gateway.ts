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
  WebrtcMediaStateDto,
} from './dto/call-signal.dto';
import {
  CreateStatusDto,
  GetStatusesDto,
  ViewStatusDto,
  DeleteStatusDto,
} from './dto/status.dto';
import {
  WatchPartyActionDto,
  WatchPartyClockPingDto,
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
    type?: 'direct' | 'youtube' | 'embed';
    duration?: number;
    provider?: string;
    originalUrl?: string;
  } | null;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  lastUpdatedTimestamp: number;
  scheduledStartServerTime?: number;
  version: number;
  lastActorNickname: string;
  isBuffering: boolean;
  bufferingUsers: string[];
  hostNickname?: string;
  isHostOnly?: boolean;
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

function sanitizeAvatarUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length > 2048) return null;
  if (/data:image\/svg/i.test(trimmed)) return null;
  if (/^(https?:\/\/|\/uploads\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
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
  private userCleanupTimer?: NodeJS.Timeout;
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

    // Run 30-day stale offline users cleanup every hour
    const userCleanupInterval = 60 * 60 * 1000;
    this.userCleanupTimer = setInterval(() => {
      void this.cleanupStaleUsers();
    }, userCleanupInterval);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.userCleanupTimer) {
      clearInterval(this.userCleanupTimer);
    }
    for (const timer of this.userDisconnectDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.userDisconnectDebounceTimers.clear();
  }

  private async cleanupStaleUsers() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.userRepo
        .createQueryBuilder()
        .delete()
        .from(User)
        .where(
          'role = :memberRole AND (isBanned IS NULL OR isBanned = false) AND isOnline = false AND ((lastSeen IS NOT NULL AND lastSeen <= :thirtyDaysAgo) OR (lastSeen IS NULL AND createdAt <= :thirtyDaysAgo))',
          {
            memberRole: 'member',
            thirtyDaysAgo,
          },
        )
        .execute();
    } catch (e) {
      console.warn('[UserCleanup] Stale users cleanup skipped', e);
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
      isMuted?: boolean;
      role?: 'host' | 'admin' | 'member';
    }
  >();

  private socketMessageTimes = new Map<string, number[]>();
  private userDisconnectDebounceTimers = new Map<string, NodeJS.Timeout>();

  private clearUserDisconnectDebounceTimer(key: string) {
    const timer = this.userDisconnectDebounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.userDisconnectDebounceTimers.delete(key);
    }
  }

  private watchPartyRooms = new Map<string, WatchPartyState>();
  private watchPartyCleanupTimers = new Map<string, NodeJS.Timeout>();
  private watchPartyBufferTimers = new Map<string, NodeJS.Timeout>();
  private watchPartyDisconnectTimers = new Map<string, NodeJS.Timeout>();

  private clearWatchPartyBufferTimer(passcode: string) {
    const timer = this.watchPartyBufferTimers.get(passcode);
    if (timer) {
      clearTimeout(timer);
      this.watchPartyBufferTimers.delete(passcode);
    }
  }

  private clearWatchPartyDisconnectTimer(passcode: string) {
    const timer = this.watchPartyDisconnectTimers.get(passcode);
    if (timer) {
      clearTimeout(timer);
      this.watchPartyDisconnectTimers.delete(passcode);
    }
  }

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

  private findSocketsInRoom(
    passcode: string,
    nickname?: string,
    excludeSocketId?: string,
  ): Array<{ socketId: string; nickname: string }> {
    const cleanPass = passcode.trim();
    const result: Array<{ socketId: string; nickname: string }> = [];
    for (const [id, user] of this.users.entries()) {
      if (user.passcode.trim() === cleanPass && id !== excludeSocketId) {
        if (
          !nickname ||
          user.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          result.push({ socketId: id, nickname: user.nickname });
        }
      }
    }
    return result;
  }

  private async getFormattedUsersList(roomPasscode: string, roomId: number) {
    const cleanPass = roomPasscode.trim();
    const activeSockets = Array.from(this.users.values()).filter(
      (s) => s.passcode === cleanPass,
    );
    const activeNicknames = new Set(
      activeSockets.map((s) => s.nickname.toLowerCase()),
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeNicksList = Array.from(activeNicknames);

    const query = this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId', { roomId });

    if (activeNicksList.length > 0) {
      query.andWhere(
        '(LOWER(user.nickname) IN (:...activeNicksList) OR user.isOnline = true OR user.isBanned = true OR user.role = :hostRole OR user.role = :adminRole OR user.isCreator = true OR user.lastSeen > :sevenDaysAgo OR (user.lastSeen IS NULL AND user.createdAt > :sevenDaysAgo))',
        { activeNicksList, sevenDaysAgo, hostRole: 'host', adminRole: 'admin' },
      );
    } else {
      query.andWhere(
        '(user.isOnline = true OR user.isBanned = true OR user.role = :hostRole OR user.role = :adminRole OR user.isCreator = true OR user.lastSeen > :sevenDaysAgo OR (user.lastSeen IS NULL AND user.createdAt > :sevenDaysAgo))',
        { sevenDaysAgo, hostRole: 'host', adminRole: 'admin' },
      );
    }

    const roomUsers = await query
      .orderBy('user.isOnline', 'DESC')
      .addOrderBy('user.lastSeen', 'DESC')
      .take(300)
      .getMany();

    const relevant = roomUsers.filter((u) => {
      if (activeNicknames.has(u.nickname.toLowerCase())) return true;
      if (u.isBanned || u.role === 'host' || u.role === 'admin' || u.isCreator) return true;
      const activityDate = u.lastSeen
        ? new Date(u.lastSeen)
        : (u.createdAt ? new Date(u.createdAt) : null);
      return activityDate ? activityDate > sevenDaysAgo : false;
    });

    return relevant.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      role: u.role || 'member',
      isCreator: Boolean(u.isCreator),
      isMuted: Boolean(u.isMuted),
      mutedUntil: u.mutedUntil,
      isBanned: Boolean(u.isBanned),
      isOnline: activeNicknames.has(u.nickname.toLowerCase()),
      lastSeen: u.lastSeen,
      deviceType: u.deviceType,
      deviceModel: u.deviceModel,
      browser: u.browser,
      os: u.os,
      avatarUrl: u.avatarUrl,
      networkLabel: u.networkLabel,
      batteryLabel: u.batteryLabel,
      batteryIsCharging: u.batteryIsCharging,
    }));
  }

  private async broadcastUsersList(roomPasscode: string, roomId: number) {
    const list = await this.getFormattedUsersList(roomPasscode, roomId);
    this.server.to(roomPasscode.trim()).emit('usersList', list);
  }

  private getCalculatedWatchPartyPosition(state: WatchPartyState): number {
    if (!state.isPlaying || state.isBuffering) {
      return state.currentTime;
    }
    const now = Date.now();
    // If playback is scheduled to start in the future, it has not advanced yet
    if (state.scheduledStartServerTime && state.scheduledStartServerTime > now) {
      return state.currentTime;
    }
    const anchorTime = state.scheduledStartServerTime || state.lastUpdatedTimestamp;
    const elapsedSec =
      Math.max(0, (now - anchorTime) / 1000) *
      (state.playbackRate || 1);
    const calculated = state.currentTime + elapsedSec;
    if (
      state.videoSource?.duration &&
      state.videoSource.duration > 0 &&
      calculated > state.videoSource.duration
    ) {
      return state.videoSource.duration;
    }
    return Math.max(0, isNaN(calculated) ? 0 : calculated);
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

    this.server.to(userInfo.passcode).emit('userStoppedTyping', {
      nickname: userInfo.nickname,
    });
    this.server.to(userInfo.passcode).emit('userStopTyping', {
      nickname: userInfo.nickname,
    });

    const userKey = `${userInfo.passcode.trim()}:${userInfo.nickname.trim()}`;
    this.clearUserDisconnectDebounceTimer(userKey);

    const debounceTimer = setTimeout(async () => {
      this.userDisconnectDebounceTimers.delete(userKey);

      const isReconnected = Array.from(this.users.values()).some(
        (info) =>
          info.nickname === userInfo.nickname &&
          info.passcode === userInfo.passcode,
      );
      if (isReconnected) {
        return;
      }

      const room = await this.roomRepo.findOne({
        where: {
          passcode: userInfo.passcode,
        },
      });

      if (room) {
        const user = await this.userRepo
          .createQueryBuilder('user')
          .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:nickname)', {
            roomId: room.id,
            nickname: userInfo.nickname.trim(),
          })
          .getOne();

        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await this.userRepo.save(user);

          // If the disconnected user was the host, perform host succession
          if (user.role === 'host') {
            const activeNicknames = new Set(
              Array.from(this.users.values())
                .filter((s) => s.passcode === room.passcode)
                .map((s) => s.nickname.toLowerCase()),
            );
            if (activeNicknames.size > 0 && !activeNicknames.has(user.nickname.toLowerCase())) {
              const onlineRoomUsers = await this.userRepo.find({
                where: { roomId: room.id },
                order: { createdAt: 'ASC' },
              });
              const candidate =
                onlineRoomUsers.find((u) => activeNicknames.has(u.nickname.toLowerCase()) && u.role === 'admin' && !u.isMuted && !u.isBanned) ||
                onlineRoomUsers.find((u) => activeNicknames.has(u.nickname.toLowerCase()) && u.nickname.toLowerCase() !== user.nickname.toLowerCase() && !u.isMuted && !u.isBanned);

              if (candidate) {
                user.role = 'member';
                candidate.role = 'host';
                await this.userRepo.save([user, candidate]);
                for (const [id, sess] of this.users.entries()) {
                  if (sess.passcode === room.passcode) {
                    if (sess.nickname.toLowerCase() === user.nickname.toLowerCase()) sess.role = 'member';
                    if (sess.nickname.toLowerCase() === candidate.nickname.toLowerCase()) sess.role = 'host';
                  }
                }
                this.server.to(room.passcode).emit('hostChanged', {
                  newHostNickname: candidate.nickname,
                  newHost: candidate.nickname,
                  previousHostNickname: user.nickname,
                  previousHost: user.nickname,
                  reason: 'Automatic succession after host disconnect',
                });
              }
            }
          }
        }

        await this.broadcastUsersList(room.passcode, room.id);
      }

      this.server.to(userInfo.passcode).emit('userOffline', {
        nickname: userInfo.nickname,
        lastSeen: new Date(),
      });

      this.server.to(userInfo.passcode).emit('userLeft', {
        nickname: userInfo.nickname,
      });
    }, 12000);

    this.userDisconnectDebounceTimers.set(userKey, debounceTimer);

    // Prevent buffer lock deadlock if disconnecting user was buffering in Watch Party
    const wpState = this.watchPartyRooms.get(userInfo.passcode);
    if (wpState && wpState.bufferingUsers?.includes(userInfo.nickname)) {
      wpState.bufferingUsers = wpState.bufferingUsers.filter(
        (u) => u !== userInfo.nickname,
      );
      if (wpState.bufferingUsers.length === 0) {
        wpState.isBuffering = false;
        wpState.lastUpdatedTimestamp = Date.now();
        wpState.scheduledStartServerTime = undefined;
        this.clearWatchPartyBufferTimer(userInfo.passcode);
      }
      wpState.version = (wpState.version || 0) + 1;
      this.server.to(userInfo.passcode).emit('watchPartyUpdate', {
        action: 'ready',
        videoSource: wpState.videoSource,
        currentTime: wpState.currentTime,
        isPlaying: wpState.isPlaying,
        playbackRate: wpState.playbackRate,
        isBuffering: wpState.isBuffering,
        bufferingUsers: wpState.bufferingUsers,
        lastUpdatedTimestamp: wpState.lastUpdatedTimestamp,
        scheduledStartServerTime: undefined,
        version: wpState.version,
        lastActorNickname: userInfo.nickname,
        hostNickname: wpState.hostNickname,
        serverTime: Date.now(),
      });
    }

    // Auto-pause Watch Party if a user leaves/disconnects during active movie playback (with 5-second grace period for quick reconnects)
    if (wpState && wpState.isActive && wpState.isPlaying) {
      this.clearWatchPartyDisconnectTimer(userInfo.passcode);
      const timer = setTimeout(() => {
        this.watchPartyDisconnectTimers.delete(userInfo.passcode);
        const currentWp = this.watchPartyRooms.get(userInfo.passcode);
        if (currentWp && currentWp.isActive && currentWp.isPlaying) {
          currentWp.isPlaying = false;
          currentWp.currentTime = this.getCalculatedWatchPartyPosition(currentWp);
          currentWp.lastUpdatedTimestamp = Date.now();
          currentWp.scheduledStartServerTime = undefined;
          currentWp.version = (currentWp.version || 0) + 1;
          this.server.to(userInfo.passcode).emit('watchPartyUpdate', {
            action: 'partner_disconnected',
            videoSource: currentWp.videoSource,
            currentTime: currentWp.currentTime,
            isPlaying: false,
            playbackRate: currentWp.playbackRate,
            isBuffering: false,
            bufferingUsers: currentWp.bufferingUsers || [],
            lastUpdatedTimestamp: currentWp.lastUpdatedTimestamp,
            scheduledStartServerTime: undefined,
            version: currentWp.version,
            lastActorNickname: userInfo.nickname,
            hostNickname: currentWp.hostNickname,
            isHostOnly: currentWp.isHostOnly,
            serverTime: Date.now(),
          });
        }
      }, 5000);
      this.watchPartyDisconnectTimers.set(userInfo.passcode, timer);
    }

    // Clean up in-memory Watch Party state with a 60-second grace period if no users remain
    const anyUserInRoom = Array.from(this.users.values()).some(
      (info) => info.passcode === userInfo.passcode,
    );
    if (!anyUserInRoom) {
      const existingTimer = this.watchPartyCleanupTimers.get(userInfo.passcode);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        this.watchPartyCleanupTimers.delete(userInfo.passcode);
        const stillAny = Array.from(this.users.values()).some(
          (info) => info.passcode === userInfo.passcode,
        );
        if (!stillAny) {
          this.watchPartyRooms.delete(userInfo.passcode);
        }
      }, 60000);
      this.watchPartyCleanupTimers.set(userInfo.passcode, timer);
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { passcode?: string },
  ) {
    const session = this.users.get(client.id);
    if (!session) return { success: false };

    const roomPasscode = (data?.passcode || session.passcode).trim();
    const userKey = `${roomPasscode}:${session.nickname.trim()}`;
    this.clearUserDisconnectDebounceTimer(userKey);

    // End any active or pending call immediately without grace period
    const activeCall = this.findCallBySocketId(client.id);
    if (activeCall) {
      if (activeCall.ringTimer) clearTimeout(activeCall.ringTimer);
      this.clearCallDisconnectTimer(activeCall.callId);
      this.activeCallSessions.delete(activeCall.callId);
      const peerId =
        activeCall.callerSocketId === client.id
          ? activeCall.calleeSocketId
          : activeCall.callerSocketId;
      if (peerId) {
        this.server.to(peerId).emit('callEnded', {
          reason: 'Call ended: participant left the room.',
          callId: activeCall.callId,
        });
      }
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: roomPasscode },
    });

    if (room) {
      this.users.delete(client.id);
      client.leave(roomPasscode);

      const remainingSockets = this.findSocketsInRoom(roomPasscode, session.nickname);
      const isCompletelyOffline = remainingSockets.length === 0;

      const user = await this.userRepo
        .createQueryBuilder('user')
        .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:nickname)', {
          roomId: room.id,
          nickname: session.nickname.trim(),
        })
        .getOne();

      if (user && isCompletelyOffline) {
        user.isOnline = false;
        user.lastSeen = new Date();
        await this.userRepo.save(user);

        // Succession only when host has no active sockets remaining
        if (user.role === 'host') {
          const activeNicknames = new Set(
            Array.from(this.users.values())
              .filter(
                (s) =>
                  s.passcode === room.passcode &&
                  s.nickname.toLowerCase() !== user.nickname.toLowerCase(),
              )
              .map((s) => s.nickname.toLowerCase()),
          );
          if (activeNicknames.size > 0) {
            const onlineRoomUsers = await this.userRepo.find({
              where: { roomId: room.id },
              order: { createdAt: 'ASC' },
            });
            const candidate =
              onlineRoomUsers.find(
                (u) =>
                  activeNicknames.has(u.nickname.toLowerCase()) &&
                  u.role === 'admin' &&
                  !u.isMuted &&
                  !u.isBanned,
              ) ||
              onlineRoomUsers.find(
                (u) =>
                  activeNicknames.has(u.nickname.toLowerCase()) &&
                  u.nickname.toLowerCase() !== user.nickname.toLowerCase() &&
                  !u.isMuted &&
                  !u.isBanned,
              );

            if (candidate) {
              user.role = 'member';
              candidate.role = 'host';
              await this.userRepo.save([user, candidate]);
              for (const [id, sess] of this.users.entries()) {
                if (sess.passcode === room.passcode) {
                  if (sess.nickname.toLowerCase() === user.nickname.toLowerCase())
                    sess.role = 'member';
                  if (sess.nickname.toLowerCase() === candidate.nickname.toLowerCase())
                    sess.role = 'host';
                }
              }
              this.server.to(room.passcode).emit('hostChanged', {
                newHostNickname: candidate.nickname,
                newHost: candidate.nickname,
                previousHostNickname: user.nickname,
                previousHost: user.nickname,
                reason: 'Host left the room',
              });
            }
          }
        }
      }

      this.server.to(roomPasscode).emit('userStoppedTyping', {
        nickname: session.nickname,
      });
      this.server.to(roomPasscode).emit('userStopTyping', {
        nickname: session.nickname,
      });

      if (isCompletelyOffline) {
        this.server.to(roomPasscode).emit('userOffline', {
          nickname: session.nickname,
          lastSeen: new Date(),
        });
        this.server.to(roomPasscode).emit('userLeft', {
          nickname: session.nickname,
        });

        await this.broadcastUsersList(room.passcode, room.id);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody()
    data: JoinRoomDto,
    @ConnectedSocket()
    client: Socket,
  ) {
    this.clearWatchPartyDisconnectTimer(data.passcode);
    const userKey = `${data.passcode.trim()}:${data.nickname.trim()}`;
    this.clearUserDisconnectDebounceTimer(userKey);
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

    const sanitizedAvatar = sanitizeAvatarUrl(data.avatarUrl);
    let cleanNick = data.nickname.trim();
    const cleanPass = room.passcode.trim();

    let user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:cleanNick)', {
        roomId: room.id,
        cleanNick,
      })
      .getOne();

    if (user) {
      cleanNick = user.nickname;
    }

    if (user && user.isBanned) {
      client.emit('kickedFromRoom', {
        reason: 'You are permanently banned from this room by the host.',
        kickedBy: 'Host',
      });
      return { success: false, message: 'You are banned from this room' };
    }

    if (data.sessionToken) {
      const bannedByToken = await this.userRepo.findOne({
        where: {
          roomId: room.id,
          sessionToken: data.sessionToken,
          isBanned: true,
        },
      });
      if (bannedByToken) {
        client.emit('kickedFromRoom', {
          reason: 'You are permanently banned from this room by the host.',
          kickedBy: 'Host',
        });
        return { success: false, message: 'You are banned from this room' };
      }
    }

    // Active Nickname Collision & Reconnection Guard
    const existingSockets = this.findSocketsInRoom(cleanPass, cleanNick, client.id);
    if (existingSockets.length > 0) {
      const isReconnectingSession =
        user &&
        user.sessionToken &&
        data.sessionToken &&
        user.sessionToken === data.sessionToken;

      if (isReconnectingSession) {
        for (const existing of existingSockets) {
          const oldSocket = this.server.sockets.sockets.get(existing.socketId);
          if (oldSocket) {
            oldSocket.emit('sessionReplaced', {
              message: 'Your session has been resumed in another connection.',
            });
            oldSocket.leave(cleanPass);
            this.users.delete(existing.socketId);
            oldSocket.disconnect(true);
          }
        }
      } else {
        client.emit('error', {
          message: `The nickname "${cleanNick}" is currently active in this room. Please choose another nickname.`,
        });
        return {
          success: false,
          message: `The nickname "${cleanNick}" is currently active in this room. Please choose another nickname.`,
        };
      }
    }

    // Offline Identity & Hijacking Guard: Protect registered admins, hosts, and recent members from nickname spoofing
    if (user && existingSockets.length === 0) {
      const isPrivileged = user.role === 'host' || user.role === 'admin' || user.isCreator;
      const isRecentMember =
        user.lastSeen &&
        Date.now() - new Date(user.lastSeen).getTime() < 24 * 60 * 60 * 1000;
      const isTokenMismatch =
        user.sessionToken &&
        data.sessionToken &&
        user.sessionToken !== data.sessionToken;

      if (isTokenMismatch) {
        if (isPrivileged) {
          client.emit('error', {
            message: `The nickname "${cleanNick}" belongs to a room host or admin. Please choose another nickname or reconnect using your original session.`,
          });
          return {
            success: false,
            message: `The nickname "${cleanNick}" belongs to a room host or admin.`,
          };
        } else if (isRecentMember) {
          client.emit('error', {
            message: `The nickname "${cleanNick}" was recently used by another participant in this room. Please choose another nickname.`,
          });
          return {
            success: false,
            message: `The nickname "${cleanNick}" was recently used in this room.`,
          };
        }
      }
    }

    const existingHost = await this.userRepo.findOne({
      where: {
        roomId: room.id,
        role: 'host',
      },
    });

    // Only assign 'host' if the room has NO host registered yet, or if this user is the registered host
    const defaultRole = (!existingHost || existingHost.nickname === cleanNick) ? 'host' : 'member';

    if (!user) {
      const isRoomCreator = !existingHost;
      user = this.userRepo.create({
        nickname: cleanNick,
        roomId: room.id,
        role: defaultRole,
        isCreator: isRoomCreator,
        sessionToken: data.sessionToken || null,
        isOnline: true,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel,
        browser: data.browser,
        os: data.os,
        avatarUrl: sanitizedAvatar,
        networkLabel: data.networkLabel,
        batteryLabel: data.batteryLabel,
        batteryIsCharging: Boolean(data.batteryIsCharging),
      });
    } else {
      user.isOnline = true;
      user.lastSeen = null;
      if (data.sessionToken) {
        user.sessionToken = data.sessionToken;
      }
      if (!existingHost && (user.isCreator || !user.role)) {
        user.role = 'host';
      }
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
      if (sanitizedAvatar) {
        user.avatarUrl = sanitizedAvatar;
      }
    }

    try {
      await this.userRepo.save(user);
    } catch (err: any) {
      if (err.code === '23505') {
        user =
          (await this.userRepo.findOne({
            where: { nickname: cleanNick, roomId: room.id },
          })) || user;
      } else {
        throw err;
      }
    }

    const roomPasscode = room.passcode.trim();
    const dataPasscode = data.passcode.trim();
    client.join(roomPasscode);
    client.join(dataPasscode);

    this.users.set(client.id, {
      nickname: user.nickname,
      passcode: roomPasscode,
      isMuted: Boolean(user.isMuted),
      role: user.role,
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

    // Cancel any pending Watch Party room cleanup timer on user reconnect
    const wpCleanup = this.watchPartyCleanupTimers.get(roomPasscode);
    if (wpCleanup) {
      clearTimeout(wpCleanup);
      this.watchPartyCleanupTimers.delete(roomPasscode);
    }

    const messages = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.roomId = :roomId', { roomId: room.id })
      .andWhere(
        '(m.isDirect = false OR m.isDirect IS NULL OR LOWER(m.nickname) = LOWER(:clientNick) OR LOWER(m.targetNickname) = LOWER(:clientNick))',
        { clientNick: cleanNick },
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

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
    await this.broadcastUsersList(room.passcode, room.id);

    this.server.to(room.passcode).emit('userOnline', {
      nickname: user.nickname,
    });

    this.server.to(room.passcode).emit('userJoined', {
      nickname: user.nickname,
      user: {
        id: user.id,
        nickname: user.nickname,
        role: user.role || 'member',
        isCreator: Boolean(user.isCreator),
        isOnline: true,
        isMuted: Boolean(user.isMuted),
        mutedUntil: user.mutedUntil,
        isBanned: Boolean(user.isBanned),
        avatarUrl: user.avatarUrl,
        deviceType: user.deviceType,
        deviceModel: user.deviceModel,
        browser: user.browser,
        os: user.os,
        networkLabel: user.networkLabel,
        batteryLabel: user.batteryLabel,
        batteryIsCharging: user.batteryIsCharging,
      },
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

    const session = this.users.get(client.id);
    if (!session || session.passcode !== data.passcode) {
      client.emit('error', {
        message: 'Unauthorized: Please join the room first',
      });
      return {
        success: false,
        message: 'Unauthorized: Please join the room first',
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

    const senderUser = await this.userRepo.findOne({
      where: {
        nickname: session.nickname,
        roomId: room.id,
      },
    });

    if (senderUser?.isBanned) {
      client.emit('error', { message: 'You are permanently banned from this room.' });
      return {
        success: false,
        message: 'You are permanently banned from this room.',
      };
    }

    if (senderUser?.isMuted) {
      if (senderUser.mutedUntil && new Date(senderUser.mutedUntil) <= new Date()) {
        senderUser.isMuted = false;
        senderUser.mutedUntil = null;
        await this.userRepo.save(senderUser);
        session.isMuted = false;
        this.server.to(room.passcode).emit('userMuteToggled', {
          targetNickname: senderUser.nickname,
          isMuted: false,
          mutedBy: 'System (Timed Mute Expired)',
        });
      } else {
        const remainingMinutes = senderUser.mutedUntil
          ? Math.ceil((new Date(senderUser.mutedUntil).getTime() - Date.now()) / 60000)
          : null;
        client.emit('error', {
          message: remainingMinutes
            ? `You are muted for ${remainingMinutes} more minute(s).`
            : 'You have been muted by the room host.',
        });
        return {
          success: false,
          message: 'You have been muted by the room host.',
        };
      }
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

    return await this.messageRepo
      .createQueryBuilder('m')
      .where('m.roomId = :roomId', { roomId: room.id })
      .andWhere(
        '(m.isDirect = false OR m.isDirect IS NULL OR LOWER(m.nickname) = LOWER(:clientNick) OR LOWER(m.targetNickname) = LOWER(:clientNick))',
        { clientNick: session.nickname.trim() },
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: TypingDto,
  ) {
    if (!this.checkRateLimit(client, 6, 2000)) return;
    const session = this.users.get(client.id);
    if (!session || session.isMuted) return;

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
    if (!session || session.isMuted) return;

    const trimmedPasscode = (data.passcode || session.passcode).trim();
    client.to(trimmedPasscode).emit('userStoppedTyping', {
      nickname: session.nickname,
    });
    client.to(trimmedPasscode).emit('userStopTyping', {
      nickname: session.nickname,
    });
  }

  @SubscribeMessage('updateMetadata')
  async updateMetadata(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode?: string;
      batteryLabel?: string;
      batteryIsCharging?: boolean;
      networkLabel?: string;
      avatarUrl?: string;
    },
  ) {
    if (!this.checkRateLimit(client, 4, 4000)) return;
    const session = this.users.get(client.id);
    if (!session) return;
    const passcode = (data.passcode || session.passcode || '').trim();
    const room = await this.roomRepo.findOne({ where: { passcode } });
    if (!room) return;

    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:nickname)', {
        roomId: room.id,
        nickname: session.nickname.trim(),
      })
      .getOne();
    if (!user) return;

    let hasChanged = false;
    if (data.batteryLabel !== undefined) {
      const cleanBat =
        typeof data.batteryLabel === 'string'
          ? data.batteryLabel.trim().slice(0, 30)
          : null;
      if (cleanBat !== user.batteryLabel) {
        user.batteryLabel = cleanBat;
        hasChanged = true;
      }
    }
    if (typeof data.batteryIsCharging === 'boolean' && data.batteryIsCharging !== user.batteryIsCharging) {
      user.batteryIsCharging = data.batteryIsCharging;
      hasChanged = true;
    }
    if (data.networkLabel !== undefined) {
      const cleanNet =
        typeof data.networkLabel === 'string'
          ? data.networkLabel.trim().slice(0, 50)
          : null;
      if (cleanNet !== user.networkLabel) {
        user.networkLabel = cleanNet;
        hasChanged = true;
      }
    }
    if (data.avatarUrl !== undefined) {
      const cleanAvatar = sanitizeAvatarUrl(data.avatarUrl);
      if (cleanAvatar !== user.avatarUrl) {
        user.avatarUrl = cleanAvatar;
        hasChanged = true;
      }
    }

    if (hasChanged) {
      await this.userRepo.save(user);
      this.server.to(passcode).emit('userMetadataUpdated', {
        nickname: session.nickname,
        batteryLabel: user.batteryLabel,
        batteryIsCharging: user.batteryIsCharging,
        networkLabel: user.networkLabel,
        avatarUrl: user.avatarUrl,
      });
      if (data.avatarUrl !== undefined) {
        await this.broadcastUsersList(room.passcode, room.id);
      }
    }
  }

  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || (hostUser.role !== 'host' && hostUser.role !== 'admin')) {
      return { success: false, message: 'Only room host or admin can kick participants' };
    }

    if (data.targetNickname.trim() === session.nickname.trim()) {
      return { success: false, message: 'Cannot kick yourself' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'User not found in room' };

    if (targetUser.role === 'host') {
      return { success: false, message: 'Cannot kick the room host' };
    }
    if (hostUser.role === 'admin' && targetUser.role === 'admin') {
      return { success: false, message: 'Admins cannot kick other admins' };
    }

    // Disconnect all sockets of target user in room if online and terminate calls
    const targets = this.findSocketsInRoom(data.passcode.trim(), targetUser.nickname);
    for (const target of targets) {
      const activeCall = this.findCallBySocketId(target.socketId);
      if (activeCall) {
        if (activeCall.ringTimer) clearTimeout(activeCall.ringTimer);
        this.clearCallDisconnectTimer(activeCall.callId);
        this.activeCallSessions.delete(activeCall.callId);
        const peerId = activeCall.callerSocketId === target.socketId ? activeCall.calleeSocketId : activeCall.callerSocketId;
        if (peerId) {
          this.server.to(peerId).emit('callEnded', {
            reason: 'Call ended: participant was removed from the room.',
            callId: activeCall.callId,
          });
        }
      }

      const targetSocket = this.server.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit('kickedFromRoom', {
          reason: 'You have been removed from the room by the host.',
          kickedBy: session.nickname,
        });
        targetSocket.leave(data.passcode.trim());
        this.users.delete(target.socketId);
        targetSocket.disconnect(true);
      }
    }

    // Clean up Watch Party state if kicked participant was buffering or hosting
    const wpState = this.watchPartyRooms.get(data.passcode.trim());
    if (wpState) {
      if (wpState.bufferingUsers?.includes(targetUser.nickname)) {
        wpState.bufferingUsers = wpState.bufferingUsers.filter((u) => u !== targetUser.nickname);
      }
      if (wpState.hostNickname?.toLowerCase() === targetUser.nickname.toLowerCase()) {
        wpState.hostNickname = session.nickname;
        wpState.isHostOnly = false;
      }
    }

    targetUser.isOnline = false;
    targetUser.lastSeen = new Date();
    await this.userRepo.save(targetUser);

    this.server.to(data.passcode.trim()).emit('userKicked', {
      targetNickname: targetUser.nickname,
      kickedBy: session.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true };
  }

  @SubscribeMessage('banUser')
  async banUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || (hostUser.role !== 'host' && hostUser.role !== 'admin')) {
      return { success: false, message: 'Only room host or admin can ban participants' };
    }

    if (data.targetNickname.trim() === session.nickname.trim()) {
      return { success: false, message: 'Cannot ban yourself' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'User not found in room' };

    if (targetUser.role === 'host') {
      return { success: false, message: 'Cannot ban the room host' };
    }
    if (hostUser.role === 'admin' && targetUser.role === 'admin') {
      return { success: false, message: 'Admins cannot ban other admins' };
    }

    targetUser.isBanned = true;
    targetUser.bannedAt = new Date();
    targetUser.isOnline = false;
    targetUser.lastSeen = new Date();
    await this.userRepo.save(targetUser);

    const targets = this.findSocketsInRoom(data.passcode.trim(), targetUser.nickname);
    for (const target of targets) {
      const activeCall = this.findCallBySocketId(target.socketId);
      if (activeCall) {
        if (activeCall.ringTimer) clearTimeout(activeCall.ringTimer);
        this.clearCallDisconnectTimer(activeCall.callId);
        this.activeCallSessions.delete(activeCall.callId);
        const peerId = activeCall.callerSocketId === target.socketId ? activeCall.calleeSocketId : activeCall.callerSocketId;
        if (peerId) {
          this.server.to(peerId).emit('callEnded', {
            reason: 'Call ended: participant was banned from the room.',
            callId: activeCall.callId,
          });
        }
      }

      const targetSocket = this.server.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit('kickedFromRoom', {
          reason: 'You have been permanently banned from this room by the host.',
          kickedBy: session.nickname,
        });
        targetSocket.leave(data.passcode.trim());
        this.users.delete(target.socketId);
        targetSocket.disconnect(true);
      }
    }

    // Clean up Watch Party state if banned participant was buffering or hosting
    const wpState = this.watchPartyRooms.get(data.passcode.trim());
    if (wpState) {
      if (wpState.bufferingUsers?.includes(targetUser.nickname)) {
        wpState.bufferingUsers = wpState.bufferingUsers.filter((u) => u !== targetUser.nickname);
      }
      if (wpState.hostNickname?.toLowerCase() === targetUser.nickname.toLowerCase()) {
        wpState.hostNickname = session.nickname;
        wpState.isHostOnly = false;
      }
    }

    this.server.to(data.passcode.trim()).emit('userBanned', {
      targetNickname: targetUser.nickname,
      bannedBy: session.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true };
  }

  @SubscribeMessage('unbanUser')
  async unbanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || (hostUser.role !== 'host' && hostUser.role !== 'admin')) {
      return { success: false, message: 'Only room host or admin can unban participants' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'User not found in room' };

    targetUser.isBanned = false;
    targetUser.bannedAt = null;
    await this.userRepo.save(targetUser);

    this.server.to(data.passcode.trim()).emit('userUnbanned', {
      targetNickname: targetUser.nickname,
      unbannedBy: session.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true };
  }

  @SubscribeMessage('promoteUser')
  async promoteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
      role: 'admin' | 'member';
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || hostUser.role !== 'host') {
      return { success: false, message: 'Only room host can promote or demote admins' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'User not found in room' };

    if (
      targetUser.role === 'host' ||
      targetUser.nickname.toLowerCase() === session.nickname.toLowerCase()
    ) {
      return {
        success: false,
        message: 'Cannot change host role. Use transferHost to reassign room ownership.',
      };
    }
    if (targetUser.isBanned) {
      return { success: false, message: 'Cannot promote a banned user' };
    }

    targetUser.role = data.role === 'admin' ? 'admin' : 'member';
    await this.userRepo.save(targetUser);

    for (const [id, user] of this.users.entries()) {
      if (
        user.passcode === data.passcode.trim() &&
        user.nickname.toLowerCase() === targetUser.nickname.toLowerCase()
      ) {
        user.role = targetUser.role;
      }
    }

    this.server.to(data.passcode.trim()).emit('userPromoted', {
      targetNickname: targetUser.nickname,
      role: targetUser.role,
      promotedBy: session.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true, role: targetUser.role };
  }

  @SubscribeMessage('transferHost')
  async transferHost(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || hostUser.role !== 'host') {
      return { success: false, message: 'Only current host can transfer room ownership' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'Target user not found' };
    if (targetUser.nickname.toLowerCase() === session.nickname.toLowerCase()) {
      return { success: false, message: 'You are already the room host' };
    }
    if (targetUser.isBanned) {
      return { success: false, message: 'Cannot transfer room ownership to a banned user' };
    }
    if (targetUser.isMuted) {
      return { success: false, message: 'Cannot transfer room ownership to a muted user' };
    }
    const targetSockets = this.findSocketsInRoom(data.passcode.trim(), targetUser.nickname);
    if (targetSockets.length === 0) {
      return {
        success: false,
        message: 'Cannot transfer room ownership to an offline participant. The user must be online.',
      };
    }

    hostUser.role = 'admin';
    targetUser.role = 'host';
    await this.userRepo.save([hostUser, targetUser]);

    for (const [id, user] of this.users.entries()) {
      if (user.passcode === data.passcode.trim()) {
        if (user.nickname.toLowerCase() === hostUser.nickname.toLowerCase()) user.role = 'admin';
        if (user.nickname.toLowerCase() === targetUser.nickname.toLowerCase()) user.role = 'host';
      }
    }

    this.server.to(data.passcode.trim()).emit('hostChanged', {
      newHostNickname: targetUser.nickname,
      newHost: targetUser.nickname,
      previousHostNickname: hostUser.nickname,
      previousHost: hostUser.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true };
  }

  @SubscribeMessage('reclaimHost')
  async reclaimHost(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const creatorUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!creatorUser || !creatorUser.isCreator) {
      return {
        success: false,
        message: 'Only the original room creator can reclaim host status.',
      };
    }
    if (creatorUser.role === 'host') {
      return { success: false, message: 'You are already the room host.' };
    }
    if (creatorUser.isBanned || creatorUser.isMuted) {
      return { success: false, message: 'Cannot reclaim host while restricted.' };
    }

    const currentHost = await this.userRepo.findOne({
      where: { roomId: room.id, role: 'host' },
    });

    if (currentHost) {
      currentHost.role = 'admin';
      await this.userRepo.save(currentHost);
    }
    creatorUser.role = 'host';
    await this.userRepo.save(creatorUser);

    for (const [id, user] of this.users.entries()) {
      if (user.passcode === data.passcode.trim()) {
        if (
          currentHost &&
          user.nickname.toLowerCase() === currentHost.nickname.toLowerCase()
        ) {
          user.role = 'admin';
        }
        if (user.nickname.toLowerCase() === creatorUser.nickname.toLowerCase()) {
          user.role = 'host';
        }
      }
    }

    this.server.to(data.passcode.trim()).emit('hostChanged', {
      newHostNickname: creatorUser.nickname,
      newHost: creatorUser.nickname,
      previousHostNickname: currentHost?.nickname || 'Previous Host',
      previousHost: currentHost?.nickname || 'Previous Host',
      reason: 'Original creator reclaimed room host privileges',
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true };
  }

  @SubscribeMessage('clearInactiveUsers')
  async clearInactiveUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      daysInactive?: number;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || (hostUser.role !== 'host' && hostUser.role !== 'admin')) {
      return { success: false, message: 'Only room host or admin can clear inactive participants' };
    }

    const days = Math.max(1, Math.min(365, Number(data.daysInactive || 7)));
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Safeguard: NEVER delete host, admins, or banned participants as "inactive"
    const deleteResult = await this.userRepo
      .createQueryBuilder()
      .delete()
      .from(User)
      .where(
        'roomId = :roomId AND role = :memberRole AND (isBanned IS NULL OR isBanned = false) AND isOnline = false AND ((lastSeen IS NOT NULL AND lastSeen < :cutoffDate) OR (lastSeen IS NULL AND createdAt < :cutoffDate))',
        {
          roomId: room.id,
          memberRole: 'member',
          cutoffDate,
        },
      )
      .execute();

    // Clean up expired statuses in this room as well
    await this.statusRepo
      .createQueryBuilder()
      .delete()
      .from(Status)
      .where('roomId = :roomId AND expiresAt IS NOT NULL AND expiresAt < :now', {
        roomId: room.id,
        now: new Date(),
      })
      .execute();

    await this.broadcastUsersList(room.passcode, room.id);
    return { success: true, removedCount: deleteResult.affected || 0 };
  }

  @SubscribeMessage('muteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
      isMuted: boolean;
      durationMinutes?: number;
    },
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) return { success: false, message: 'Room not found' };

    const hostUser = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!hostUser || (hostUser.role !== 'host' && hostUser.role !== 'admin')) {
      return { success: false, message: 'Only room host or admin can mute/unmute participants' };
    }

    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: data.targetNickname.trim(),
      })
      .getOne();
    if (!targetUser) return { success: false, message: 'User not found in room' };

    if (data.targetNickname.trim().toLowerCase() === session.nickname.trim().toLowerCase()) {
      return { success: false, message: 'Cannot mute yourself' };
    }

    if (targetUser.role === 'host') {
      return { success: false, message: 'Cannot mute the room host' };
    }
    if (hostUser.role === 'admin' && targetUser.role === 'admin') {
      return { success: false, message: 'Admins cannot mute other admins' };
    }

    targetUser.isMuted = Boolean(data.isMuted);
    targetUser.mutedUntil =
      data.isMuted && data.durationMinutes && data.durationMinutes > 0
        ? new Date(Date.now() + data.durationMinutes * 60 * 1000)
        : null;
    await this.userRepo.save(targetUser);

    for (const [id, user] of this.users.entries()) {
      if (
        user.passcode === data.passcode.trim() &&
        user.nickname.toLowerCase() === targetUser.nickname.toLowerCase()
      ) {
        user.isMuted = targetUser.isMuted;
      }
    }

    if (targetUser.isMuted) {
      const targets = this.findSocketsInRoom(data.passcode.trim(), targetUser.nickname);
      for (const target of targets) {
        const call = this.findCallBySocketId(target.socketId);
        if (call) {
          if (call.ringTimer) clearTimeout(call.ringTimer);
          this.clearCallDisconnectTimer(call.callId);
          this.activeCallSessions.delete(call.callId);
          const peerId = call.callerSocketId === target.socketId ? call.calleeSocketId : call.callerSocketId;
          if (peerId) {
            this.server.to(peerId).emit('callEnded', {
              reason: 'Call ended: participant was muted by the host.',
              callId: call.callId,
            });
          }
          this.server.to(target.socketId).emit('callEnded', {
            reason: 'Call ended: you were muted by the host.',
            callId: call.callId,
          });
        }
      }
    }

    this.server.to(data.passcode.trim()).emit('userMuteToggled', {
      targetNickname: targetUser.nickname,
      isMuted: targetUser.isMuted,
      mutedUntil: targetUser.mutedUntil,
      mutedBy: session.nickname,
    });

    await this.broadcastUsersList(room.passcode, room.id);
    return {
      success: true,
      isMuted: targetUser.isMuted,
      mutedUntil: targetUser.mutedUntil,
    };
  }

  @SubscribeMessage('sendDirectMessage')
  async sendDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      passcode: string;
      targetNickname: string;
      message: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    },
  ) {
    if (!this.checkRateLimit(client, 10, 3000)) {
      return { success: false, message: 'Rate limit exceeded' };
    }
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: data.passcode.trim() },
    });
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    if (session.isMuted) {
      const sender = await this.userRepo.findOne({
        where: { nickname: session.nickname, roomId: room.id },
      });
      if (sender?.mutedUntil && new Date(sender.mutedUntil) <= new Date()) {
        sender.isMuted = false;
        sender.mutedUntil = null;
        await this.userRepo.save(sender);
        session.isMuted = false;
        this.server.to(room.passcode).emit('userMuteToggled', {
          targetNickname: sender.nickname,
          isMuted: false,
          mutedBy: 'System (Timed Mute Expired)',
        });
      } else {
        const remainingMinutes = sender?.mutedUntil
          ? Math.ceil((new Date(sender.mutedUntil).getTime() - Date.now()) / 60000)
          : null;
        client.emit('error', {
          message: remainingMinutes
            ? `You are muted for ${remainingMinutes} more minute(s).`
            : 'You have been muted by the room host.',
        });
        return { success: false, message: 'You have been muted by the room host.' };
      }
    }

    if (!data.message?.trim() && !data.fileUrl) {
      return { success: false, message: 'Message content is empty' };
    }

    if (data.targetNickname.trim().toLowerCase() === session.nickname.trim().toLowerCase()) {
      return { success: false, message: 'Cannot whisper yourself' };
    }

    const targetNickname = data.targetNickname.trim();
    const targetUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.roomId = :roomId AND LOWER(user.nickname) = LOWER(:target)', {
        roomId: room.id,
        target: targetNickname,
      })
      .getOne();

    if (!targetUser) {
      client.emit('directMessageError', {
        targetNickname,
        message: `@${targetNickname} is not a member of this room.`,
      });
      return { success: false, message: `Participant "${targetNickname}" not found in this room` };
    }

    if (targetUser.isBanned) {
      client.emit('directMessageError', {
        targetNickname,
        message: `@${targetNickname} is banned from this room and cannot receive whispers.`,
      });
      return { success: false, message: `Participant "${targetNickname}" is banned from this room` };
    }

    const savedDirectMsg = await this.messageRepo.save(
      this.messageRepo.create({
        roomId: room.id,
        nickname: session.nickname,
        targetNickname: targetUser.nickname,
        message: data.message ? data.message.trim() : '',
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileType: data.fileType ?? null,
        fileSize: data.fileSize ?? null,
        isDirect: true,
      }),
    );

    const targets = this.findSocketsInRoom(data.passcode.trim(), targetUser.nickname);
    for (const t of targets) {
      this.server.to(t.socketId).emit('directMessage', savedDirectMsg);
    }
    const senderSockets = this.findSocketsInRoom(data.passcode.trim(), session.nickname);
    for (const s of senderSockets) {
      this.server.to(s.socketId).emit('directMessage', savedDirectMsg);
    }

    return {
      success: true,
      message: savedDirectMsg,
      isOfflineDelivery: targets.length === 0,
    };
  }

  @SubscribeMessage('getUsers')
  async getUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: GetRoomDto,
  ) {
    const passcode = (data?.passcode || '').trim();
    if (!passcode) {
      client.emit('usersList', []);
      return;
    }

    const room = await this.roomRepo.findOne({
      where: {
        passcode,
      },
    });

    if (!room) {
      client.emit('usersList', []);
      return;
    }

    const list = await this.getFormattedUsersList(room.passcode, room.id);
    client.emit('usersList', list);
  }

  @SubscribeMessage('callUser')
  async callUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallUserDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();

    if (session.isMuted) {
      const roomEntity = await this.roomRepo.findOne({ where: { passcode: room } });
      const callerUser = roomEntity
        ? await this.userRepo.findOne({
            where: { nickname: session.nickname, roomId: roomEntity.id },
          })
        : null;

      if (callerUser?.mutedUntil && new Date(callerUser.mutedUntil) <= new Date()) {
        callerUser.isMuted = false;
        callerUser.mutedUntil = null;
        await this.userRepo.save(callerUser);
        session.isMuted = false;
        this.server.to(room).emit('userMuteToggled', {
          targetNickname: callerUser.nickname,
          isMuted: false,
          mutedBy: 'System (Timed Mute Expired)',
        });
      } else {
        const remainingMinutes = callerUser?.mutedUntil
          ? Math.ceil((new Date(callerUser.mutedUntil).getTime() - Date.now()) / 60000)
          : null;
        client.emit('callError', {
          message: remainingMinutes
            ? `You are muted for ${remainingMinutes} more minute(s) and cannot place calls.`
            : 'You have been muted by the host and cannot place calls.',
        });
        return;
      }
    }

    // Clean up any stale call sessions previously initiated by this socket
    const prevCall = this.findCallBySocketId(client.id);
    if (prevCall) {
      if (prevCall.ringTimer) clearTimeout(prevCall.ringTimer);
      this.activeCallSessions.delete(prevCall.callId);
    }

    // Resolve target socket (explicit socket ID, targeted nickname, or other participant in 2-person room)
    let target: { socketId: string; nickname: string } | undefined = undefined;
    if (data.targetSocketId) {
      const targetSession = this.users.get(data.targetSocketId);
      if (targetSession && targetSession.passcode.trim() === room) {
        target = { socketId: data.targetSocketId, nickname: targetSession.nickname };
      }
    } else {
      target = this.findSocketInRoom(room, data.targetNickname, client.id);
    }

    // If target was specified but no matching online user was found in this room
    if ((data.targetNickname || data.targetSocketId) && !target) {
      client.emit('callError', {
        message: `${data.targetNickname || 'Participant'} is currently offline or unavailable.`,
      });
      return;
    }

    if (target && (target.socketId === client.id || target.nickname.trim().toLowerCase() === session.nickname.trim().toLowerCase())) {
      client.emit('callError', {
        message: 'You cannot place a call to yourself.',
      });
      return;
    }

    // Check if target is already in an active call or is muted
    if (target) {
      const targetSession = this.users.get(target.socketId);
      if (targetSession?.isMuted) {
        const roomEntity = await this.roomRepo.findOne({ where: { passcode: room } });
        const targetDbUser = roomEntity
          ? await this.userRepo.findOne({
              where: { nickname: targetSession.nickname, roomId: roomEntity.id },
            })
          : null;
        if (targetDbUser?.mutedUntil && new Date(targetDbUser.mutedUntil) <= new Date()) {
          targetDbUser.isMuted = false;
          targetDbUser.mutedUntil = null;
          await this.userRepo.save(targetDbUser);
          targetSession.isMuted = false;
          this.server.to(room).emit('userMuteToggled', {
            targetNickname: targetDbUser.nickname,
            isMuted: false,
            mutedBy: 'System (Timed Mute Expired)',
          });
        } else {
          client.emit('callError', {
            message: `${target.nickname} is currently muted by the host and cannot receive calls.`,
          });
          return;
        }
      }
      const targetActiveCall = this.findCallBySocketId(target.socketId);
      if (targetActiveCall) {
        if (targetActiveCall.state === 'active') {
          client.emit('callBusy', {
            nickname: target.nickname,
            reason: 'User is currently on another call.',
          });
          return;
        }

        // WebRTC Glare: Both participants initiated a call to each other simultaneously!
        if (
          targetActiveCall.state === 'calling' &&
          targetActiveCall.callerSocketId === target.socketId &&
          targetActiveCall.calleeSocketId === client.id
        ) {
          const myNick = session.nickname.toLowerCase();
          const peerNick = target.nickname.toLowerCase();
          if (myNick > peerNick) {
            client.emit('callInfo', {
              message: `${target.nickname} is already calling you.`,
            });
            return;
          } else {
            // Lexicographically smaller nickname becomes the caller; cancel peer's colliding pending session
            if (targetActiveCall.ringTimer) clearTimeout(targetActiveCall.ringTimer);
            this.activeCallSessions.delete(targetActiveCall.callId);
          }
        } else if (targetActiveCall.state === 'calling') {
          client.emit('callBusy', {
            nickname: target.nickname,
            reason: 'User is currently placing or receiving another call.',
          });
          return;
        }
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

    if (session.isMuted) {
      client.emit('callError', {
        message: 'You have been muted by the host and cannot join voice or video calls.',
      });
      return;
    }

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
      const targetSession = this.users.get(data.targetSocketId);
      if (targetSession && targetSession.passcode.trim() === room) {
        this.server.to(data.targetSocketId).emit('callAccepted', acceptPayload);
        this.server.to(data.targetSocketId).emit('acceptCall', acceptPayload);
      }
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
      const targetSession = this.users.get(targetSocketId);
      if (targetSession && targetSession.passcode.trim() === room) {
        this.server.to(targetSocketId).emit('webrtcOffer', offerPayload);
      }
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
      const targetSession = this.users.get(targetSocketId);
      if (targetSession && targetSession.passcode.trim() === room) {
        this.server.to(targetSocketId).emit('webrtcAnswer', answerPayload);
        this.server.to(targetSocketId).emit('callAccepted', {
          receiverName: data.receiverName || session.nickname,
          from: session.nickname,
        });
      }
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
      const targetSession = this.users.get(targetSocketId);
      if (targetSession && targetSession.passcode.trim() === room) {
        this.server.to(targetSocketId).emit('webrtcCandidate', candidatePayload);
      }
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
  clientPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: any,
  ) {
    return {
      success: true,
      timestamp: Date.now(),
      clientTime: data?.clientTime,
    };
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

  @SubscribeMessage('webrtcMediaState')
  webrtcMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcMediaStateDto,
  ) {
    const session = this.users.get(client.id);
    if (!session || session.passcode.trim() !== data.passcode?.trim()) return;

    const room = session.passcode.trim();
    const callSession = this.findCallBySocketId(client.id);
    const targetSocketId =
      data.targetSocketId ||
      (callSession
        ? callSession.callerSocketId === client.id
          ? callSession.calleeSocketId
          : callSession.callerSocketId
        : undefined);

    const payload = {
      from: session.nickname,
      fromSocketId: client.id,
      micMuted: data.micMuted,
      cameraOff: data.cameraOff,
    };

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtcMediaState', payload);
    } else {
      client.to(room).emit('webrtcMediaState', payload);
    }
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
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      client.emit('error', { message: 'Only room host or admin can clear history.' });
      return { success: false, message: 'Only room host or admin can clear history.' };
    }

    await this.messageRepo.delete({ roomId: room.id });

    // Clear pinned message in room
    room.pinnedMessageId = null;
    await this.roomRepo.save(room);

    console.log(
      `[ClearHistory] Room ${targetPasscode} history cleared by ${user.role} ${session.nickname}`,
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

    const user = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      client.emit('error', { message: 'Only room host or admin can pin messages.' });
      return { success: false, message: 'Only room host or admin can pin messages.' };
    }

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
    if (!session || session.isMuted) return;
    if (
      session.passcode.trim().toLowerCase() !==
      (data.passcode || '').trim().toLowerCase()
    )
      return;

    const room = await this.roomRepo.findOne({
      where: { passcode: session.passcode },
    });
    if (!room) return;

    const user = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (user?.isBanned || user?.isMuted) return;

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

    const user = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (user?.isBanned) {
      client.emit('error', { message: 'You are permanently banned from this room.' });
      return { success: false, message: 'You are permanently banned from this room.' };
    }

    if (session.isMuted || user?.isMuted) {
      client.emit('error', { message: 'You are muted and cannot post status stories.' });
      return { success: false, message: 'You are muted and cannot post status stories.' };
    }

    const now = new Date();
    const activeCount = await this.statusRepo
      .createQueryBuilder('status')
      .where('status.roomId = :roomId AND LOWER(status.nickname) = LOWER(:nickname)', {
        roomId: room.id,
        nickname: session.nickname.trim(),
      })
      .andWhere('(status.expiresAt IS NULL OR status.expiresAt > :now)', { now })
      .getCount();

    if (activeCount >= 5) {
      client.emit('error', {
        message: 'Maximum 5 active statuses allowed at a time. Please wait for an existing status to expire or delete one.',
      });
      return { success: false, message: 'Status quota reached (max 5 active)' };
    }

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

    if (session.isMuted) {
      client.emit('error', { message: 'You have been muted by the host and cannot control the watch party.' });
      return { success: false, message: 'You have been muted by the host and cannot control the watch party.' };
    }

    let state = this.watchPartyRooms.get(targetPasscode);
    const now = Date.now();

    // Cancel pending eviction timer if users are actively interacting
    if (this.watchPartyCleanupTimers.has(targetPasscode)) {
      clearTimeout(this.watchPartyCleanupTimers.get(targetPasscode)!);
      this.watchPartyCleanupTimers.delete(targetPasscode);
    }

    if (!state) {
      state = {
        isActive: true,
        videoSource: data.videoSource || null,
        currentTime: data.currentTime || 0,
        isPlaying: Boolean(data.isPlaying),
        playbackRate: data.playbackRate || 1,
        lastUpdatedTimestamp: now,
        scheduledStartServerTime: undefined,
        version: 1,
        lastActorNickname: session.nickname,
        hostNickname: session.nickname,
        isHostOnly: false,
        isBuffering: false,
        bufferingUsers: [],
      };
      this.watchPartyRooms.set(targetPasscode, state);
    }

    // Enforce host-only permissions when lock is active
    if (
      state.isHostOnly &&
      session.nickname !== state.hostNickname &&
      ['play', 'pause', 'seek', 'rate', 'change_video'].includes(data.action)
    ) {
      return {
        success: false,
        message: 'Only the party host can control movie playback',
      };
    }

    if (session.isMuted) {
      return {
        success: false,
        message: 'You are muted and cannot initiate or control Watch Party',
      };
    }

    const currentPos = this.getCalculatedWatchPartyPosition(state);

    switch (data.action) {
      case 'open':
      case 'invite':
        if (!this.checkRateLimit(client, 2, 6000)) {
          return { success: false, message: 'Please wait between Watch Party invites.' };
        }
        state.isActive = true;
        if (data.videoSource) state.videoSource = data.videoSource;
        if (data.currentTime !== undefined)
          state.currentTime = data.currentTime;
        state.lastActorNickname = session.nickname;
        state.lastUpdatedTimestamp = now;
        state.version = (state.version || 0) + 1;
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
        // Preserve running movie timestamp if already playing; don't reset to 0:00!
        state.currentTime =
          currentPos > 0
            ? currentPos
            : data.currentTime !== undefined
              ? data.currentTime
              : state.currentTime || 0;
        const acceptScheduledStart = now + 350;
        state.lastUpdatedTimestamp = acceptScheduledStart;
        state.scheduledStartServerTime = acceptScheduledStart;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        state.version = (state.version || 0) + 1;
        this.server.to(targetPasscode).emit('watchPartyAccepted', {
          acceptedBy: session.nickname,
          videoSource: state.videoSource,
          scheduledStartServerTime: acceptScheduledStart,
          currentTime: state.currentTime,
        });
        break;

      case 'decline':
        client.to(targetPasscode).emit('watchPartyDeclined', {
          declinedBy: session.nickname,
        });
        return { success: true };

      case 'play':
        // Idempotency: if already playing within 500ms, don't restart scheduled timer
        if (
          state.isPlaying &&
          state.scheduledStartServerTime &&
          Math.abs(now - state.scheduledStartServerTime) < 500
        ) {
          return { success: true };
        }
        // Scheduled future playback to eliminate asymmetric network latency lag
        const playScheduledStart = now + 300;
        state.isPlaying = true;
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.lastUpdatedTimestamp = playScheduledStart;
        state.scheduledStartServerTime = playScheduledStart;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        state.version = (state.version || 0) + 1;
        break;

      case 'pause':
        // Idempotency: if already paused and position hasn't drifted significantly, avoid jitter
        if (
          !state.isPlaying &&
          (data.currentTime === undefined ||
            Math.abs(data.currentTime - state.currentTime) < 0.5)
        ) {
          return { success: true };
        }
        state.isPlaying = false;
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.lastUpdatedTimestamp = now;
        state.scheduledStartServerTime = undefined;
        state.lastActorNickname = session.nickname;
        state.version = (state.version || 0) + 1;
        break;

      case 'seek':
        state.currentTime =
          data.currentTime !== undefined ? Math.max(0, data.currentTime) : 0;
        if (data.isPlaying !== undefined) {
          state.isPlaying = data.isPlaying;
        }
        if (state.isPlaying) {
          const seekScheduledStart = now + 300;
          state.lastUpdatedTimestamp = seekScheduledStart;
          state.scheduledStartServerTime = seekScheduledStart;
        } else {
          state.lastUpdatedTimestamp = now;
          state.scheduledStartServerTime = undefined;
        }
        state.lastActorNickname = session.nickname;
        state.version = (state.version || 0) + 1;
        break;

      case 'rate':
        state.currentTime =
          data.currentTime !== undefined ? data.currentTime : currentPos;
        state.playbackRate = data.playbackRate || 1;
        state.lastUpdatedTimestamp = now;
        state.scheduledStartServerTime = undefined;
        state.lastActorNickname = session.nickname;
        state.version = (state.version || 0) + 1;
        break;

      case 'change_video':
        state.videoSource = data.videoSource || null;
        state.currentTime = 0;
        state.isPlaying = false;
        state.playbackRate = 1;
        state.lastUpdatedTimestamp = now;
        state.scheduledStartServerTime = undefined;
        state.lastActorNickname = session.nickname;
        state.isBuffering = false;
        state.bufferingUsers = [];
        state.isActive = true;
        state.version = (state.version || 0) + 1;
        this.clearWatchPartyBufferTimer(targetPasscode);
        break;

      case 'buffering':
        if (!state.bufferingUsers.includes(session.nickname)) {
          state.bufferingUsers.push(session.nickname);
        }
        state.isBuffering = true;
        state.currentTime = currentPos;
        state.lastUpdatedTimestamp = now;
        state.scheduledStartServerTime = undefined;
        state.version = (state.version || 0) + 1;

        // Auto-release watchdog: after 10s of buffering without ready, auto-unblock room
        this.clearWatchPartyBufferTimer(targetPasscode);
        const bufWatchdog = setTimeout(() => {
          this.watchPartyBufferTimers.delete(targetPasscode);
          const st = this.watchPartyRooms.get(targetPasscode);
          if (st && st.isBuffering) {
            st.isBuffering = false;
            st.bufferingUsers = [];
            st.lastUpdatedTimestamp = Date.now();
            st.scheduledStartServerTime = undefined;
            st.version = (st.version || 0) + 1;
            this.server.to(targetPasscode).emit('watchPartyUpdate', {
              action: 'ready',
              videoSource: st.videoSource,
              currentTime: st.currentTime,
              isPlaying: st.isPlaying,
              playbackRate: st.playbackRate,
              isBuffering: false,
              bufferingUsers: [],
              lastUpdatedTimestamp: st.lastUpdatedTimestamp,
              scheduledStartServerTime: undefined,
              version: st.version,
              lastActorNickname: 'Auto-Watchdog',
              hostNickname: st.hostNickname,
              serverTime: Date.now(),
            });
          }
        }, 10000);
        this.watchPartyBufferTimers.set(targetPasscode, bufWatchdog);
        break;

      case 'ready':
        state.bufferingUsers = state.bufferingUsers.filter(
          (u) => u !== session.nickname,
        );
        if (state.bufferingUsers.length === 0) {
          state.isBuffering = false;
          if (state.isPlaying) {
            const readyScheduledStart = now + 300;
            state.lastUpdatedTimestamp = readyScheduledStart;
            state.scheduledStartServerTime = readyScheduledStart;
          } else {
            state.lastUpdatedTimestamp = now;
            state.scheduledStartServerTime = undefined;
          }
          this.clearWatchPartyBufferTimer(targetPasscode);
        }
        state.version = (state.version || 0) + 1;
        break;

      case 'sync_tick':
      case 'heartbeat':
        if (state.isPlaying && !state.isBuffering) {
          state.currentTime = currentPos;
          state.lastUpdatedTimestamp = now;
        }
        break;

      case 'close':
        state.isActive = false;
        state.isPlaying = false;
        this.clearWatchPartyBufferTimer(targetPasscode);
        this.watchPartyRooms.delete(targetPasscode);
        this.server.to(targetPasscode).emit('watchPartyClosed', {
          closedBy: session.nickname,
        });
        return { success: true };

      case 'toggle_host_lock':
        if (session.nickname === state.hostNickname) {
          state.isHostOnly = !state.isHostOnly;
          state.lastUpdatedTimestamp = now;
          state.version = (state.version || 0) + 1;
        }
        break;
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
      scheduledStartServerTime: state.scheduledStartServerTime,
      version: state.version || 1,
      lastActorNickname: session.nickname,
      hostNickname: state.hostNickname,
      isHostOnly: Boolean(state.isHostOnly),
      serverTime: now,
    };

    // Broadcast synchronized state to everyone in the room
    this.server.to(targetPasscode).emit('watchPartyUpdate', payload);
    return { success: true, state: payload };
  }

  @SubscribeMessage('watchPartyClockPing')
  handleWatchPartyClockPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WatchPartyClockPingDto,
  ) {
    const serverTime = Date.now();
    return {
      clientSendTime: data?.clientSendTime || 0,
      serverTime,
    };
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

    if (this.watchPartyCleanupTimers.has(targetPasscode)) {
      clearTimeout(this.watchPartyCleanupTimers.get(targetPasscode)!);
      this.watchPartyCleanupTimers.delete(targetPasscode);
    }

    const state = this.watchPartyRooms.get(targetPasscode);
    if (!state || !state.isActive) {
      client.emit('watchPartyState', null);
      return { success: true, state: null };
    }

    const calculatedTime = this.getCalculatedWatchPartyPosition(state);
    const now = Date.now();
    const payload = {
      action: 'sync',
      videoSource: state.videoSource,
      currentTime: calculatedTime,
      isPlaying: state.isPlaying,
      playbackRate: state.playbackRate,
      isBuffering: state.isBuffering,
      bufferingUsers: state.bufferingUsers,
      lastUpdatedTimestamp: state.lastUpdatedTimestamp,
      scheduledStartServerTime: state.scheduledStartServerTime,
      version: state.version || 1,
      lastActorNickname: state.lastActorNickname,
      hostNickname: state.hostNickname,
      isHostOnly: Boolean(state.isHostOnly),
      serverTime: now,
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

    if (session.isMuted) {
      client.emit('error', {
        message: 'You are muted and cannot post watch party comments.',
      });
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

    const room = await this.roomRepo.findOne({
      where: { passcode: targetPasscode },
    });
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    const user = await this.userRepo.findOne({
      where: { nickname: session.nickname, roomId: room.id },
    });
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      client.emit('error', {
        message: 'Only room host or admin can update room wallpaper.',
      });
      return {
        success: false,
        message: 'Only room host or admin can update room wallpaper.',
      };
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
