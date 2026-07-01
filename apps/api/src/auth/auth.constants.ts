export const RESPONSE_MESSAGES = {
  FORGOT_PASSWORD: 'If an account exists, a password reset link will be sent.',
} as const;

export const PASSPORT_STRATEGIES = {
  JWT: 'jwt',
  LOCAL: 'local',
} as const;

export const AUTH_CONTROLLER_NAME = 'AuthController';

export const AUTH_HANDLER_NAMES = {
  LOGIN: 'login',
  REFRESH: 'refresh',
  REGISTER: 'register',
} as const;

export const AUTH_ROUTES = {
  ROOT: 'auth',
  FORGOT_PASSWORD: 'forgot-password',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REFRESH: 'refresh',
  REGISTER: 'register',
  RESET_PASSWORD: 'reset-password',
} as const;

export const AUTH_CREDENTIAL_FIELDS = {
  EMAIL: 'email',
  PASSWORD: 'password',
} as const;

export const AUTH_VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
} as const;

export const VALIDATION_MESSAGES = {
  MISSING_REFRESH_TOKEN: 'Missing refresh token',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
  PASSWORD_MUST_BE_STRING: 'Password must be a string',
  REFRESH_TOKEN_MUST_BE_STRING: 'Refresh token must be a string',
} as const;

export const JWT_CONFIG = {
  AUDIENCE: 'aegis-api',
  EXPIRES_IN_MINUTES: 60,
  ISSUER: 'aegis',
  SUBJECT_PREFIX: 'aegis|',
} as const;

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const RESET_TOKEN_EXPIRATION_MINUTES = 15;

export const ROLES_KEY = 'roles';
