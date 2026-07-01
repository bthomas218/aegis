import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import crypto from 'node:crypto';
import { SessionsService } from 'src/sessions/sessions.service';

const EXPIRY_DAYS = 7;

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async create(userId: string, userAgent?: string, ipAddress?: string) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getTokenExpiry();
    const familyId = crypto.randomUUID();

    await this.sessions.create({
      userId,
      expiresAt,
      userAgent,
      ipAddress,
      refreshToken: {
        tokenHash,
        expiresAt,
        familyId,
      },
    });

    return token;
  }

  async validate(token: string) {
    const tokenHash = this.hashToken(token);
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (
      !refreshToken ||
      refreshToken.revokedAt !== null ||
      refreshToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid Refresh Token');
    }

    return refreshToken;
  }

  async revoke(token: string) {
    const tokenHash = this.hashToken(token);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async rotate(token: string) {
    const tokenHash = this.hashToken(token);

    const result = await this.prisma.$transaction(async (tx) => {
      const oldToken = await tx.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          session: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!oldToken) {
        throw new UnauthorizedException('Invalid Refresh Token');
      }

      if (
        !oldToken.session ||
        oldToken.session.revokedAt ||
        oldToken.session.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Invalid Refresh Token');
      }

      if (oldToken.revokedAt !== null) {
        // Token reuse detected. Return a marker so these writes commit before
        // the caller receives the unauthorized error.
        await tx.refreshToken.updateMany({
          where: {
            familyId: oldToken.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await tx.session.updateMany({
          where: {
            id: oldToken.sessionId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
        return {
          reuseDetected: true,
        } as const;
      }

      if (oldToken.expiresAt <= new Date()) {
        throw new UnauthorizedException('Invalid Refresh Token');
      }

      const newToken = this.generateToken();
      const newTokenHash = this.hashToken(newToken);

      await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          expiresAt: oldToken.expiresAt,
          familyId: oldToken.familyId,
          sessionId: oldToken.sessionId,
          parentId: oldToken.id,
        },
      });

      await tx.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
        },
      });

      return {
        reuseDetected: false,
        user: oldToken.session.user,
        newToken,
      } as const;
    });

    if (result.reuseDetected) {
      throw new UnauthorizedException('Refresh Token Reuse Detected');
    }

    return {
      user: result.user,
      newToken: result.newToken,
    };
  }

  async logout(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const refreshToken = await tx.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          sessionId: true,
        },
      });

      if (!refreshToken) return;

      await tx.session.updateMany({
        where: {
          id: refreshToken.sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          sessionId: refreshToken.sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  private getTokenExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);
    return expiresAt;
  }
}
