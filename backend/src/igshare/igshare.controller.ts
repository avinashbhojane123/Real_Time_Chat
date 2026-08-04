import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { IgshareService } from './igshare.service';

@Controller('igshare')
export class IgshareController {
  constructor(private readonly igshareService: IgshareService) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'IGShare Instagram Account-Free Browser Viewer API',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('view')
  async resolveViewGet(@Query('url') urlParam?: string) {
    return this.igshareService.resolveMediaView(urlParam);
  }

  @Post('view')
  async resolveViewPost(@Body('url') urlBody?: string) {
    return this.igshareService.resolveMediaView(urlBody);
  }

  @Get('proxy')
  async proxyStream(
    @Query('url') mediaUrl: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    return this.igshareService.proxyMediaStream(mediaUrl, req, res);
  }
}

