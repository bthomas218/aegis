import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSessionDTO } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSession: CreateSessionDTO) {
    return await this.prisma.session.create({
      data: {
        userId: createSession.userId,
        expiresAt: createSession.expiresAt,
        userAgent: createSession.userAgent,
        ipAddress: createSession.ipAddress,
        refreshTokens: {
          create: {
            tokenHash: createSession.refreshToken.tokenHash,
            expiresAt: createSession.refreshToken.expiresAt,
            familyId: createSession.refreshToken.familyId,
          },
        },
      },
    });
  }

  async find(id: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session Not Found');
    }
    return session;
  }

  async findMany(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions;
  }

  async revoke(id: string, userId: string) {
    const result = await this.prisma.session.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session Not Found');
    }
  }

  async revokeAll(userId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
