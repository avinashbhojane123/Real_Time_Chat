import {
  Controller,
  Get,
  Post,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { KeepAliveService } from './keep-alive.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('keep-alive')
@UseGuards(RateLimitGuard)
export class KeepAliveController {
  constructor(private readonly keepAliveService: KeepAliveService) {}

  @Get()
  getKeepAliveStatus() {
    return this.keepAliveService.getStatus();
  }

  @Get('/ping')
  ping() {
    return {
      statusCode: 200,
      status: 'ok',
      message: 'Server is active and responsive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Post('/ping-now')
  async triggerPingNow(@Headers('x-admin-key') adminKey?: string) {
    const configuredAdminKey =
      process.env.ADMIN_API_KEY || process.env.SESSION_SECRET;

    if (configuredAdminKey && configuredAdminKey.trim()) {
      if (!adminKey || typeof adminKey !== 'string') {
        throw new ForbiddenException(
          'Missing or invalid administrative authorization key',
        );
      }
      const providedBuf = Buffer.from(adminKey.trim(), 'utf-8');
      const expectedBuf = Buffer.from(configuredAdminKey.trim(), 'utf-8');

      if (
        providedBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(providedBuf, expectedBuf)
      ) {
        throw new ForbiddenException(
          'Invalid administrative authorization key',
        );
      }
    }

    return await this.keepAliveService.pingServer();
  }
}
