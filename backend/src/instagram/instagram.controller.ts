import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { InstagramService } from './instagram.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('preview')
  @UseGuards(RateLimitGuard)
  async getPreview(@Query('url') url: string, @Req() req: Request) {
    if (!url) {
      throw new BadRequestException('Query parameter "url" is required');
    }

    // Safely derive server public URL without trusting unverified spoofed Host headers
    const configuredServerUrl =
      process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL;

    let baseUrlPrefix: string;
    if (configuredServerUrl && configuredServerUrl.trim()) {
      baseUrlPrefix = configuredServerUrl.trim().replace(/\/+$/, '');
    } else {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const protocol =
        (typeof forwardedProto === 'string'
          ? forwardedProto.split(',')[0].trim()
          : req.protocol) || 'https';

      const rawHost = req.get('host') || 'localhost:10000';
      // Sanitize hostname to prevent header injection or unexpected schemes
      const sanitizedHost = /^[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/.test(rawHost)
        ? rawHost
        : 'localhost:10000';

      baseUrlPrefix = `${protocol}://${sanitizedHost}`;
    }

    return this.instagramService.getPreview(url, baseUrlPrefix);
  }

  @Get('proxy-media')
  @UseGuards(RateLimitGuard)
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
  @UseGuards(RateLimitGuard)
  setSessionKey(
    @Body('sessionId') sessionId: string,
    @Headers('x-admin-key') adminKey?: string,
  ) {
    const configuredAdminKey =
      process.env.ADMIN_API_KEY || process.env.SESSION_SECRET;

    if (!configuredAdminKey || !configuredAdminKey.trim()) {
      throw new ForbiddenException(
        'Administrative session key management is not configured on this server.',
      );
    }

    if (!adminKey || typeof adminKey !== 'string') {
      throw new ForbiddenException(
        'Invalid or missing administrative authorization key',
      );
    }

    const providedBuf = Buffer.from(adminKey.trim(), 'utf-8');
    const expectedBuf = Buffer.from(configuredAdminKey.trim(), 'utf-8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new ForbiddenException(
        'Invalid or missing administrative authorization key',
      );
    }

    this.instagramService.setCustomSessionId(sessionId);
    return {
      success: true,
      configured: this.instagramService.hasSessionId(),
    };
  }
}
