import { Controller, Post, Body } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JoinRoomHttpDto } from './dto/join-room-http.dto';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomService: RoomsService,
  ) {}

  @Post('join')
  async join(
    @Body()
    body: JoinRoomHttpDto,
  ) {
    const room =
      await this.roomService.findOrCreate(
        body.passcode,
      );

    return {
      success: true,
      room,
      nickname: body.nickname,
    };
  }
}