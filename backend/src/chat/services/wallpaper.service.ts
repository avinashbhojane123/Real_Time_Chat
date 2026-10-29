import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { join } from 'path';
import * as fs from 'fs';

import { Room } from '../../rooms/room.entity';
import { UpdateRoomWallpaperDto } from '../dto/room-wallpaper.dto';
import { RoomWallpaperState, UserSession } from '../chat.types';

async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class WallpaperService {
  private roomWallpapers = new Map<string, RoomWallpaperState>();

  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async validateRoomWallpaper(room: Room): Promise<void> {
    if (!room || !room.customWallpaper) return;
    const wp = room.customWallpaper.trim();
    if (wp.includes('/uploads/') || wp.includes('/api/uploads/')) {
      const match = wp.match(/uploads\/([^/?#]+)/i);
      if (match && match[1]) {
        const filename = match[1];
        const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
        const filePath = join(process.cwd(), uploadDirName, filename);
        const exists = await fileExistsAsync(filePath);
        if (!exists) {
          console.warn(
            `[WallpaperService] Room ${room.passcode} wallpaper file ${filename} not found on disk. Resetting dead wallpaper.`,
          );
          room.customWallpaper = null;
          if (room.theme === 'custom') {
            room.theme = 'wa-doodle';
          }
          try {
            await this.roomRepo.save(room);
          } catch (e) {
            console.error(
              '[WallpaperService] Failed to save cleaned room wallpaper:',
              e,
            );
          }
        }
      }
    }
  }

  async cleanupDeadWallpapers(): Promise<void> {
    try {
      const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
      const uploadDir = join(process.cwd(), uploadDirName);
      const roomsWithWallpaper = await this.roomRepo
        .createQueryBuilder('r')
        .where('r.customWallpaper IS NOT NULL')
        .getMany();

      for (const r of roomsWithWallpaper) {
        if (
          r.customWallpaper &&
          (r.customWallpaper.includes('/uploads/') ||
            r.customWallpaper.includes('/api/uploads/'))
        ) {
          const match = r.customWallpaper.match(/uploads\/([^/?#]+)/i);
          if (match && match[1]) {
            const filename = match[1];
            const filePath = join(uploadDir, filename);
            const exists = await fileExistsAsync(filePath);
            if (!exists) {
              console.warn(
                `[WallpaperService:Bootstrap] Room ${r.passcode} wallpaper file ${filename} not found on disk. Resetting dead wallpaper.`,
              );
              r.customWallpaper = null;
              if (r.theme === 'custom') {
                r.theme = 'wa-doodle';
              }
              await this.roomRepo.save(r);
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        '[WallpaperService:Bootstrap] Room wallpaper verification skipped:',
        err,
      );
    }
  }

  getRoomWallpaperState(roomPasscode: string, room: Room): RoomWallpaperState {
    const activeWallpaper = this.roomWallpapers.get(roomPasscode) || {
      theme: room.theme || 'wa-doodle',
      customWallpaper: room.customWallpaper || null,
    };

    if (!this.roomWallpapers.has(roomPasscode)) {
      this.roomWallpapers.set(roomPasscode, activeWallpaper);
    }

    return activeWallpaper;
  }

  async updateRoomWallpaper(
    server: Server,
    session: UserSession | undefined,
    data: UpdateRoomWallpaperDto,
  ) {
    const targetPasscode = (data.passcode || session?.passcode || '').trim();
    if (!session || !targetPasscode || session.passcode !== targetPasscode) {
      return { success: false, message: 'Unauthorized session' };
    }

    const room = await this.roomRepo.findOne({
      where: { passcode: targetPasscode },
    });
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    if (session.role !== 'host' && session.role !== 'admin') {
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

    let newWallpaper =
      data.customWallpaper !== undefined
        ? data.customWallpaper
        : currentCached.customWallpaper;

    // Reject non-existent /uploads/ files asynchronously
    if (
      newWallpaper &&
      (newWallpaper.includes('/uploads/') ||
        newWallpaper.includes('/api/uploads/'))
    ) {
      const match = newWallpaper.match(/uploads\/([^/?#]+)/i);
      if (match && match[1]) {
        const filename = match[1];
        const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
        const filePath = join(process.cwd(), uploadDirName, filename);
        const exists = await fileExistsAsync(filePath);
        if (!exists) {
          console.warn(
            `[WallpaperService] Rejecting non-existent wallpaper upload file ${filename}`,
          );
          newWallpaper = null;
        }
      }
    }

    const updatedState: RoomWallpaperState = {
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
        '[WallpaperService] Could not persist wallpaper to database:',
        err,
      );
    }

    // Broadcast synchronized wallpaper to all participants in this passcode room
    server.to(targetPasscode).emit('roomWallpaperUpdated', {
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
