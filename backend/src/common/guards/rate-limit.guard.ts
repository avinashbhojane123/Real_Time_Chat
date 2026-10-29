import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, RateLimitRecord>();
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxHits = 120; // max 45 requests per minute per route per verified client IP
  private lastPruneTime = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Use Express req.ip (secured via app.set('trust proxy', 1))
    const clientIp = (req.ip || req.socket?.remoteAddress || 'unknown-ip').trim();
    const route = req.baseUrl || req.path || '';
    const key = `${clientIp}:${route}`;
    const now = Date.now();

    // Periodic prune every 30s instead of blocking on every request
    if (now - this.lastPruneTime > 30000 || this.hits.size > 2000) {
      this.lastPruneTime = now;
      for (const [k, val] of this.hits.entries()) {
        if (now > val.resetTime) {
          this.hits.delete(k);
        }
      }
    }

    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      this.hits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxHits) {
      throw new HttpException(
        'Too many requests. Please slow down and try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
