import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import crypto from 'node:crypto';

const EXPIRY_DAYS = 7;

@Injectable()
export class RefreshTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getTokenExpiry();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
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

  async rotate(token: string) {
    const tokenHash = this.hashToken(token);

    return await this.prisma.$transaction(async (tx) => {
      const oldToken = await tx.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

      if (
        !oldToken ||
        oldToken.revokedAt !== null ||
        oldToken.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Invalid Refresh Token');
      }

      await tx.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
        },
      });
      const newToken = this.generateToken();
      const newTokenHash = this.hashToken(newToken);
      const expiresAt = this.getTokenExpiry();

      await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          expiresAt,
          userId: oldToken.userId,
        },
      });

      return {
        user: oldToken.user,
        newToken,
      };
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
