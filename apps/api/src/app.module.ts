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

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_SECRET: z.string(),
});

function isAuthHandler(handlerName: string) {
  return (context: ExecutionContext) =>
    context.getClass().name !== 'AuthController' ||
    context.getHandler().name !== handlerName;
}

function getEmailTracker(req: Record<string, unknown>) {
  const body = req.body as { email?: unknown } | undefined;

  if (typeof body?.email === 'string' && body.email) {
    return body.email.trim().toLowerCase();
  }

  return typeof req.ip === 'string' && req.ip ? req.ip : 'unknown';
}

function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(z.treeifyError(result.error), null, 2));
    throw new Error('Environment validation failed');
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
          config.getOrThrow<string>('REDIS_URL'),
        ),
        throttlers: [
          {
            name: 'default',
            limit: 100,
            ttl: minutes(1),
          },
          {
            name: 'loginIp',
            limit: 5,
            ttl: minutes(1),
            skipIf: isAuthHandler('login'),
          },
          {
            name: 'loginEmail',
            limit: 10,
            ttl: minutes(1),
            skipIf: isAuthHandler('login'),
            getTracker: getEmailTracker,
          },
          {
            name: 'registerIp',
            limit: 3,
            ttl: hours(1),
            skipIf: isAuthHandler('register'),
          },
          {
            name: 'refreshSession',
            limit: 60,
            ttl: minutes(1),
            skipIf: isAuthHandler('refresh'),
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
