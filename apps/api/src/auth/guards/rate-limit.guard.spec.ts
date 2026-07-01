import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerRequest, ThrottlerStorage } from '@nestjs/throttler';
import crypto from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RateLimitGuard } from './rate-limit.guard';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

class TestRateLimitGuard extends RateLimitGuard {
  checkRefreshSession(req: Record<string, unknown>) {
    const context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
        getResponse: jest.fn().mockReturnValue({
          header: jest.fn(),
        }),
      }),
    } as unknown as ExecutionContext;

    return this.handleRequest({
      context,
      limit: 60,
      ttl: 60_000,
      blockDuration: 60_000,
      throttler: {
        name: 'refreshSession',
        limit: 60,
        ttl: 60_000,
      },
      getTracker: () => 'unused',
      generateKey: (_context, tracker, throttlerName) =>
        `${throttlerName}:${tracker}`,
    } satisfies ThrottlerRequest);
  }
}

describe('RateLimitGuard', () => {
  const storageMock: ThrottlerStorage = {
    increment: jest.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60_000,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  };
  const prismaServiceMock: {
    refreshToken: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
    };
  } = {
    refreshToken: {
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
    },
  };
  let guard: TestRateLimitGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    guard = new TestRateLimitGuard(
      {
        throttlers: [
          {
            name: 'default',
            limit: 100,
            ttl: 60_000,
          },
        ],
      },
      storageMock,
      new Reflector(),
      prismaServiceMock as unknown as PrismaService,
    );
    await guard.onModuleInit();
  });

  it('tracks refresh requests by session id when the token is known', async () => {
    const refreshToken = 'refresh-token';
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    prismaServiceMock.refreshToken.findUnique.mockResolvedValue({
      sessionId: 'session-1',
    });

    await expect(
      guard.checkRefreshSession({
        body: {
          refreshToken,
        },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe(true);

    expect(prismaServiceMock.refreshToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash,
      },
      select: {
        sessionId: true,
      },
    });
    expect(storageMock.increment).toHaveBeenCalledWith(
      'refreshSession:session-1',
      60_000,
      60,
      60_000,
      'refreshSession',
    );
  });

  it('falls back to the request IP when no refresh token is present', async () => {
    await expect(
      guard.checkRefreshSession({
        body: {},
        ip: '127.0.0.1',
      }),
    ).resolves.toBe(true);

    expect(prismaServiceMock.refreshToken.findUnique).not.toHaveBeenCalled();
    expect(storageMock.increment).toHaveBeenCalledWith(
      'refreshSession:127.0.0.1',
      60_000,
      60,
      60_000,
      'refreshSession',
    );
  });
});
