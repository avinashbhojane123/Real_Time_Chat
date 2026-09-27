import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { User } from '../users/user.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async checkBanned(roomId: number, nickname: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { roomId, nickname },
    });
    return Boolean(user?.isBanned);
  }

  async findOrCreate(passcode: string): Promise<Room> {
    let room = await this.roomRepo.findOne({
      where: { passcode },
    });

    if (!room) {
      try {
        room = this.roomRepo.create({
          passcode,
        });

        await this.roomRepo.save(room);
      } catch (err: any) {
        if (err.code === '23505') {
          room = await this.roomRepo.findOne({
            where: { passcode },
          });
        } else {
          throw err;
        }
      }
    }

    if (!room) {
      throw new Error(
        `Failed to create or find room with passcode ${passcode}`,
      );
    }

    return room;
  }
}
