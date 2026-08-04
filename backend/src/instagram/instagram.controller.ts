import { Controller, Get, Post, Query, Body, Req, Res } from '@nestjs/common';
import * as express from 'express';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'Instagram Service (gallery-dl powered)',
      canViewWithoutAccount: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('view')
  async resolveMediaViewGet(@Query('url') urlParam?: string) {
    return this.instagramService.resolveMediaView(urlParam);
  }

  @Post('view')
  async resolveMediaViewPost(@Body('url') urlBody?: string) {
    return this.instagramService.resolveMediaView(urlBody);
  }

  @Get('stream')
  async streamMedia(
    @Query('url') mediaUrl: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    return this.instagramService.proxyMediaStream(mediaUrl, req, res);
  }
}
