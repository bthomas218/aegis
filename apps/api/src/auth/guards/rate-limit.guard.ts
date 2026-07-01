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
import { UNKNOWN_TRACKER } from 'src/common/constants/http.constants';
import { THROTTLE_NAMES } from 'src/common/constants/throttle.constants';
import { TOKEN_CONFIG } from 'src/common/constants/token.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { hashToken } from 'src/utils/token-utils';

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
    if (requestProps.throttler.name === THROTTLE_NAMES.REFRESH_SESSION) {
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

    const tokenHash = hashToken(body.refreshToken);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        sessionId: true,
      },
    });

    return (
      refreshToken?.sessionId ?? `${TOKEN_CONFIG.TRACKER_PREFIX}${tokenHash}`
    );
  }

  private getIpTracker(req: Record<string, unknown>) {
    return (
      (typeof req.ip === 'string' && req.ip) ||
      (typeof req.socket === 'object' &&
      req.socket !== null &&
      'remoteAddress' in req.socket &&
      typeof req.socket.remoteAddress === 'string'
        ? req.socket.remoteAddress
        : UNKNOWN_TRACKER)
    );
  }
}
