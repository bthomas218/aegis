import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerRequest,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import crypto from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super(options, storageService, reflector);
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    if (requestProps.throttler.name === 'refreshSession') {
      return super.handleRequest({
        ...requestProps,
        getTracker: (req) => this.getRefreshSessionTracker(req),
      });
    }

    return super.handleRequest(requestProps);
  }

  private async getRefreshSessionTracker(req: Record<string, unknown>) {
    const body = req.body as { refreshToken?: unknown } | undefined;

    if (typeof body?.refreshToken !== 'string' || !body.refreshToken) {
      return this.getIpTracker(req);
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(body.refreshToken)
      .digest('hex');

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        sessionId: true,
      },
    });

    return refreshToken?.sessionId ?? `token:${tokenHash}`;
  }

  private getIpTracker(req: Record<string, unknown>) {
    return (
      (typeof req.ip === 'string' && req.ip) ||
      (typeof req.socket === 'object' &&
      req.socket !== null &&
      'remoteAddress' in req.socket &&
      typeof req.socket.remoteAddress === 'string'
        ? req.socket.remoteAddress
        : 'unknown')
    );
  }
}
