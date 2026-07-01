import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as tokenUtils from 'src/utils/token-utils';

const RESET_TOKEN_EXPIRATION_MINUTES = 15;
@Injectable()
export class ResetTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string) {
    const token = tokenUtils.generateRandomToken();
    const tokenHash = tokenUtils.hashToken(token);
    const expiresAt = this.getTokenExpiry();

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  async find(token: string) {
    const tokenHash = tokenUtils.hashToken(token);

    return await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async markUsed(id: string) {
    await this.prisma.passwordResetToken.update({
      where: {
        id,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  private getTokenExpiry() {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + RESET_TOKEN_EXPIRATION_MINUTES,
    );
    return expiresAt;
  }
}
