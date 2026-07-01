import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionsService } from './sessions.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SessionsService', () => {
  let service: SessionsService;

  const prismaServiceMock: {
    session: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
      findFirst: jest.Mock<Promise<unknown>, [unknown]>;
      findMany: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
    };
  } = {
    session: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findFirst: jest.fn<Promise<unknown>, [unknown]>(),
      findMany: jest.fn<Promise<unknown>, [unknown]>(),
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a session with a nested refresh token', async () => {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    const createSession = {
      userId: 'user-1',
      expiresAt,
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      refreshToken: {
        tokenHash: 'token-hash',
        expiresAt,
        familyId: 'family-1',
      },
    };
    const createdSession = { id: 'session-1', ...createSession };

    prismaServiceMock.session.create.mockResolvedValue(createdSession);

    await expect(service.create(createSession)).resolves.toEqual(
      createdSession,
    );
    expect(prismaServiceMock.session.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        expiresAt,
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        refreshTokens: {
          create: {
            tokenHash: 'token-hash',
            expiresAt,
            familyId: 'family-1',
          },
        },
      },
    });
  });

  it('finds a session by id and user id', async () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
    };

    prismaServiceMock.session.findFirst.mockResolvedValue(session);

    await expect(service.find('session-1', 'user-1')).resolves.toEqual(session);
    expect(prismaServiceMock.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 'user-1',
      },
    });
  });

  it('throws NotFoundException when a session cannot be found', async () => {
    prismaServiceMock.session.findFirst.mockResolvedValue(null);

    await expect(service.find('session-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('finds active sessions for a user ordered by newest first', async () => {
    const sessions = [{ id: 'session-1' }, { id: 'session-2' }];

    prismaServiceMock.session.findMany.mockResolvedValue(sessions);

    await expect(service.findMany('user-1')).resolves.toEqual(sessions);

    const findManyArgs = prismaServiceMock.session.findMany.mock
      .calls[0]?.[0] as {
      where: {
        userId: string;
        revokedAt: null;
        expiresAt: { gt: Date };
      };
      orderBy: { createdAt: 'desc' };
    };

    expect(findManyArgs.where.userId).toBe('user-1');
    expect(findManyArgs.where.revokedAt).toBeNull();
    expect(findManyArgs.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('revokes a session by id and user id', async () => {
    prismaServiceMock.session.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.revoke('session-1', 'user-1'),
    ).resolves.toBeUndefined();

    const updateManyArgs = prismaServiceMock.session.updateMany.mock
      .calls[0]?.[0] as {
      where: {
        id: string;
        userId: string;
      };
      data: {
        revokedAt: Date;
      };
    };

    expect(updateManyArgs.where).toEqual({
      id: 'session-1',
      userId: 'user-1',
    });
    expect(updateManyArgs.data.revokedAt).toBeInstanceOf(Date);
  });

  it('throws NotFoundException when revoking a missing session', async () => {
    prismaServiceMock.session.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.revoke('session-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('revokes all active sessions for a user', async () => {
    prismaServiceMock.session.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.revokeAll('user-1')).resolves.toBeUndefined();

    const updateManyArgs = prismaServiceMock.session.updateMany.mock
      .calls[0]?.[0] as {
      where: {
        userId: string;
        revokedAt: null;
        expiresAt: { gt: Date };
      };
      data: {
        revokedAt: Date;
      };
    };

    expect(updateManyArgs.where.userId).toBe('user-1');
    expect(updateManyArgs.where.revokedAt).toBeNull();
    expect(updateManyArgs.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(updateManyArgs.data.revokedAt).toBeInstanceOf(Date);
  });
});
