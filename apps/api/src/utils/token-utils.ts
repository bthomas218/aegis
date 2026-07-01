import crypto from 'node:crypto';

export function hashToken(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return hash;
}

export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
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
