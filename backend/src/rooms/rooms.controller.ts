import {
  Controller,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JoinRoomHttpDto } from './dto/join-room-http.dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { generateSessionToken } from '../common/utils/session-token.util';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomService: RoomsService) {}

  @Post('join')
  @UseGuards(RateLimitGuard)
  async join(
    @Body()
    body: JoinRoomHttpDto,
  ) {
    const room = await this.roomService.findOrCreate(body.passcode.trim());

    const isBanned = await this.roomService.checkBanned(
      room.id,
      body.nickname.trim(),
    );
    if (isBanned) {
      throw new ForbiddenException(
        'You are permanently banned from this room by the host.',
      );
    }

    const sessionToken = generateSessionToken({
      roomId: room.id,
      passcode: room.passcode,
      nickname: body.nickname.trim(),
      issuedAt: Date.now(),
    });

    return {
      success: true,
      roomId: room.id,
      passcode: room.passcode,
      nickname: body.nickname.trim(),
      sessionToken,
      theme: room.theme || 'wa-doodle',
      customWallpaper: room.customWallpaper || null,
    };
  }
}
