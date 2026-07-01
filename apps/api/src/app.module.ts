import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { ThrottlerModule, hours, minutes } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RateLimitGuard } from './auth/guards/rate-limit.guard';
import type { ExecutionContext } from '@nestjs/common';
import {
  APP_ENVIRONMENTS,
  DEFAULT_NODE_ENV,
  DEFAULT_PORT,
  ENV_KEYS,
} from './common/constants/env.constants';
import {
  AUTH_CONTROLLER_NAME,
  AUTH_HANDLER_NAMES,
} from './auth/auth.constants';
import { ERROR_MESSAGES } from './common/constants/error-messages.constants';
import {
  THROTTLE_LIMITS,
  THROTTLE_NAMES,
  THROTTLE_TTL,
} from './common/constants/throttle.constants';
import { UNKNOWN_TRACKER } from './common/constants/http.constants';

const envSchema = z.object({
  [ENV_KEYS.NODE_ENV]: z.enum(APP_ENVIRONMENTS).default(DEFAULT_NODE_ENV),
  [ENV_KEYS.PORT]: z.coerce.number().default(DEFAULT_PORT),
  [ENV_KEYS.DATABASE_URL]: z.url(),
  [ENV_KEYS.REDIS_URL]: z.url(),
  [ENV_KEYS.JWT_SECRET]: z.string(),
});

function isAuthHandler(handlerName: string) {
  return (context: ExecutionContext) =>
    context.getClass().name !== AUTH_CONTROLLER_NAME ||
    context.getHandler().name !== handlerName;
}

function getEmailTracker(req: Record<string, unknown>) {
  const body = req.body as { email?: unknown } | undefined;

  if (typeof body?.email === 'string' && body.email) {
    return body.email.trim().toLowerCase();
  }

  return typeof req.ip === 'string' && req.ip ? req.ip : UNKNOWN_TRACKER;
}

function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error(ERROR_MESSAGES.ENV_CONFIG_INVALID);
    console.error(JSON.stringify(z.treeifyError(result.error), null, 2));
    throw new Error(ERROR_MESSAGES.ENV_VALIDATION_FAILED);
  }

  return result.data;
}
@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new ThrottlerStorageRedisService(
          config.getOrThrow<string>(ENV_KEYS.REDIS_URL),
        ),
        throttlers: [
          {
            name: THROTTLE_NAMES.DEFAULT,
            limit: THROTTLE_LIMITS.DEFAULT,
            ttl: minutes(THROTTLE_TTL.DEFAULT_MINUTES),
          },
          {
            name: THROTTLE_NAMES.LOGIN_IP,
            limit: THROTTLE_LIMITS.LOGIN_IP,
            ttl: minutes(THROTTLE_TTL.LOGIN_IP_MINUTES),
            skipIf: isAuthHandler(AUTH_HANDLER_NAMES.LOGIN),
          },
          {
            name: THROTTLE_NAMES.LOGIN_EMAIL,
            limit: THROTTLE_LIMITS.LOGIN_EMAIL,
            ttl: minutes(THROTTLE_TTL.LOGIN_EMAIL_MINUTES),
            skipIf: isAuthHandler(AUTH_HANDLER_NAMES.LOGIN),
            getTracker: getEmailTracker,
          },
          {
            name: THROTTLE_NAMES.REGISTER_IP,
            limit: THROTTLE_LIMITS.REGISTER_IP,
            ttl: hours(THROTTLE_TTL.REGISTER_IP_HOURS),
            skipIf: isAuthHandler(AUTH_HANDLER_NAMES.REGISTER),
          },
          {
            name: THROTTLE_NAMES.REFRESH_SESSION,
            limit: THROTTLE_LIMITS.REFRESH_SESSION,
            ttl: minutes(THROTTLE_TTL.REFRESH_SESSION_MINUTES),
            skipIf: isAuthHandler(AUTH_HANDLER_NAMES.REFRESH),
          },
        ],
      }),
    }),
    UsersModule,
    AuthModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
