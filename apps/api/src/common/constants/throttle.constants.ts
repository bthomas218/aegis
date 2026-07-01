export const THROTTLE_NAMES = {
  DEFAULT: 'default',
  LOGIN_EMAIL: 'loginEmail',
  LOGIN_IP: 'loginIp',
  REFRESH_SESSION: 'refreshSession',
  REGISTER_IP: 'registerIp',
} as const;

export const THROTTLE_LIMITS = {
  DEFAULT: 100,
  LOGIN_EMAIL: 10,
  LOGIN_IP: 5,
  REFRESH_SESSION: 60,
  REGISTER_IP: 3,
} as const;

export const THROTTLE_TTL = {
  DEFAULT_MINUTES: 1,
  LOGIN_EMAIL_MINUTES: 1,
  LOGIN_IP_MINUTES: 1,
  REFRESH_SESSION_MINUTES: 1,
  REGISTER_IP_HOURS: 1,
} as const;
