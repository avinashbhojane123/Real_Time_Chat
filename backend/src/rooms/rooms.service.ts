import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
  ) {}

  async findOrCreate(passcode: string) {
    let room = await this.roomRepo.findOne({
      where: { passcode },
    });

    if (!room) {
      room = this.roomRepo.create({
        passcode,
      });

      await this.roomRepo.save(room);
    }

    return room;
  }
}