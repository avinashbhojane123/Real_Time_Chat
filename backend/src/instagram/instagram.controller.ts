import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('preview')
  async getPreview(
    @Query('url') url: string,
    @Req() req: Request,
  ) {
    if (!url) {
      throw new BadRequestException('Query parameter "url" is required');
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:10000';
    const baseUrlPrefix = `${protocol}://${host}`;

    return this.instagramService.getPreview(url, baseUrlPrefix);
  }

  @Get('proxy-media')
  proxyMedia(
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!url) {
      throw new BadRequestException('Query parameter "url" is required');
    }
    return this.instagramService.proxyMedia(url, req, res);
  }

  @Get('session-status')
  getSessionStatus() {
    return {
      configured: this.instagramService.hasSessionId(),
    };
  }

  @Post('session-key')
  setSessionKey(@Body('sessionId') sessionId: string) {
    this.instagramService.setCustomSessionId(sessionId);
    return {
      success: true,
      configured: this.instagramService.hasSessionId(),
    };
  }
}
