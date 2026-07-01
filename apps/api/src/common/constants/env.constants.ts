export const APP_ENVIRONMENTS = ['development', 'production', 'test'] as const;
export const DEFAULT_NODE_ENV = 'development';
export const DEFAULT_PORT = 3000;

export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  DATABASE_URL: 'DATABASE_URL',
  REDIS_URL: 'REDIS_URL',
  JWT_SECRET: 'JWT_SECRET',
} as const;
