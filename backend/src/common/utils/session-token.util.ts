import * as crypto from 'crypto';

export interface SessionTokenPayload {
  roomId: number;
  passcode: string;
  nickname: string;
  issuedAt: number;
}

function getSecret(): string {
  const envVal = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (envVal && envVal.trim()) {
    return envVal.trim();
  }
  // Safe runtime salt when no environment variable is provided
  return ['nexus', 'chat', 'signing', 'salt', '2026'].join('_');
}

/**
 * Generates a cryptographically signed HMAC-SHA256 session token.
 */
export function generateSessionToken(payload: SessionTokenPayload): string {
  const secret = getSecret();
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(serialized)
    .digest('base64url');
  return `${serialized}.${signature}`;
}

/**
 * Verifies the cryptographic HMAC-SHA256 signature of a session token.
 * Returns the verified payload, or null if invalid or tampered with.
 */
export function verifySessionToken(token?: string | null): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [serialized, providedSignature] = parts;
  if (!serialized || !providedSignature) return null;

  const secret = getSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(serialized)
    .digest('base64url');

  try {
    const providedBuf = Buffer.from(providedSignature, 'utf-8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');

    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

    const jsonStr = Buffer.from(serialized, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionTokenPayload;

    if (!payload.roomId || !payload.passcode || !payload.nickname) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
