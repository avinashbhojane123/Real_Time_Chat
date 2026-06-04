import { Controller, Post, Body } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomService: RoomsService,
  ) {}

  @Post('join')
  async join(
    @Body()
    body: {
      nickname: string;
      passcode: string;
    },
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