import crypto from 'node:crypto';
import { TOKEN_CONFIG } from 'src/common/constants/token.constants';

export function hashToken(token: string): string {
  const hash = crypto
    .createHash(TOKEN_CONFIG.HASH_ALGORITHM)
    .update(token)
    .digest(TOKEN_CONFIG.ENCODING);
  return hash;
}

export function generateRandomToken(
  length: number = TOKEN_CONFIG.DEFAULT_RANDOM_BYTES,
): string {
  return crypto.randomBytes(length).toString(TOKEN_CONFIG.ENCODING);
}

export function getTokenExpiry({
  minutes,
  seconds,
  hours,
  days,
}: {
  minutes?: number;
  seconds?: number;
  hours?: number;
  days?: number;
}): Date {
  const now = new Date();
  if (minutes) now.setMinutes(now.getMinutes() + minutes);
  if (seconds) now.setSeconds(now.getSeconds() + seconds);
  if (hours) now.setHours(now.getHours() + hours);
  if (days) now.setDate(now.getDate() + days);
  return now;
}
