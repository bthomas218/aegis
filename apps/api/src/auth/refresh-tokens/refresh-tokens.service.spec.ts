import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import crypto from 'node:crypto';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from 'src/prisma/prisma.service';
import { SessionsService } from 'src/sessions/sessions.service';
import { RefreshTokensService } from './refresh-tokens.service';

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;

  type TransactionMock = {
    refreshToken: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
      create: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
    session: {
      updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };

  type TransactionCallback = (tx: TransactionMock) => Promise<unknown>;

  const prismaServiceMock: {
    refreshToken: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  } = {
    refreshToken: {
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      updateMany: jest.fn<Promise<unknown>, [unknown]>(),
    },
    $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
  };

  const sessionsServiceMock: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  } = {
    create: jest.fn<Promise<unknown>, [unknown]>(),
  };

  let txMock: TransactionMock;

  beforeEach(async () => {
    txMock = {
      refreshToken: {
        findUnique: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
        create: jest.fn<Promise<unknown>, [unknown]>(),
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
      },
      session: {
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };

    prismaServiceMock.refreshToken.findUnique.mockReset();
    prismaServiceMock.refreshToken.updateMany.mockReset();
    prismaServiceMock.$transaction.mockReset();
    prismaServiceMock.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(txMock),
    );
    sessionsServiceMock.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    service = module.get<RefreshTokensService>(RefreshTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a refresh token and stores a hashed copy for the user', async () => {
    sessionsServiceMock.create.mockResolvedValue({ id: 'session-1' });

    const token = await service.create('user-1', 'Mozilla/5.0', '127.0.0.1');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    expect(token).toEqual(expect.any(String));

    const createArgs = sessionsServiceMock.create.mock.calls[0]?.[0] as {
      userId: string;
      expiresAt: Date;
      userAgent: string;
      ipAddress: string;
      refreshToken: {
        tokenHash: string;
        expiresAt: Date;
        familyId: string;
      };
    };

    expect(createArgs.userId).toBe('user-1');
    expect(createArgs.expiresAt).toBeInstanceOf(Date);
    expect(createArgs.userAgent).toBe('Mozilla/5.0');
    expect(createArgs.ipAddress).toBe('127.0.0.1');
    expect(createArgs.refreshToken.tokenHash).toBe(tokenHash);
    expect(createArgs.refreshToken.expiresAt).toBe(createArgs.expiresAt);
    expect(createArgs.refreshToken.familyId).toEqual(expect.any(String));
  });

  it('returns a refresh token record when validation succeeds', async () => {
    const token = 'valid-token';
    const refreshTokenRecord = {
      id: 'token-1',
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };

    prismaServiceMock.refreshToken.findUnique.mockResolvedValue(
      refreshTokenRecord,
    );

    await expect(service.validate(token)).resolves.toEqual(refreshTokenRecord);
    expect(prismaServiceMock.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: refreshTokenRecord.tokenHash },
    });
  });

  it('throws UnauthorizedException for invalid, revoked, or expired tokens', async () => {
    const token = 'invalid-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    prismaServiceMock.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.validate(token)).rejects.toThrow(
      UnauthorizedException,
    );

    prismaServiceMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-2',
      tokenHash,
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    await expect(service.validate(token)).rejects.toThrow(
      'Invalid Refresh Token',
    );

    prismaServiceMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-3',
      tokenHash,
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
    });
    await expect(service.validate(token)).rejects.toThrow(
      'Invalid Refresh Token',
    );
  });

  it('revokes a refresh token by hash', async () => {
    const token = 'revoke-me';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await service.revoke(token);

    const updateManyArgs = prismaServiceMock.refreshToken.updateMany.mock
      .calls[0]?.[0] as {
      where: {
        tokenHash: string;
        revokedAt: null;
      };
      data: {
        revokedAt: Date;
      };
    };

    expect(updateManyArgs.where.tokenHash).toBe(tokenHash);
    expect(updateManyArgs.where.revokedAt).toBeNull();
    expect(updateManyArgs.data.revokedAt).toBeInstanceOf(Date);
  });

  it('rotates an active token by revoking it and creating a replacement', async () => {
    const token = 'old-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const oldTokenRecord = {
      id: 'token-1',
      tokenHash,
      sessionId: 'session-1',
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      },
    };

    txMock.refreshToken.findUnique.mockResolvedValue(oldTokenRecord);
    txMock.refreshToken.update.mockResolvedValue({});
    txMock.refreshToken.create.mockResolvedValue({});

    const result = await service.rotate(token);

    expect(result).toMatchObject({
      user: oldTokenRecord.session.user,
    });
    expect(typeof result.newToken).toBe('string');

    const findUniqueArgs = txMock.refreshToken.findUnique.mock
      .calls[0]?.[0] as {
      where: { tokenHash: string };
      include: { session: { include: { user: true } } };
    };
    expect(findUniqueArgs.where.tokenHash).toBe(tokenHash);
    expect(findUniqueArgs.include).toEqual({
      session: { include: { user: true } },
    });

    const updateArgs = txMock.refreshToken.update.mock.calls[0]?.[0] as {
      where: { tokenHash: string };
      data: { revokedAt: Date };
    };
    expect(updateArgs.where.tokenHash).toBe(tokenHash);
    expect(updateArgs.data.revokedAt).toBeInstanceOf(Date);

    const createArgs = txMock.refreshToken.create.mock.calls[0]?.[0] as {
      data: {
        tokenHash: string;
        expiresAt: Date;
        familyId: string;
        sessionId: string;
        parentId: string;
      };
    };
    expect(typeof createArgs.data.tokenHash).toBe('string');
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    expect(createArgs.data.familyId).toBe('family-1');
    expect(createArgs.data.sessionId).toBe('session-1');
    expect(createArgs.data.parentId).toBe('token-1');
  });

  it('rejects rotation when the token is invalid', async () => {
    const token = 'missing-token';

    txMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.rotate(token)).rejects.toThrow(UnauthorizedException);
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects rotation when the session is revoked or expired', async () => {
    const token = 'token-with-invalid-session';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    txMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      tokenHash,
      sessionId: 'session-1',
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: {
        id: 'session-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: { id: 'user-1', email: 'user@example.com' },
      },
    });

    await expect(service.rotate(token)).rejects.toThrow(
      'Invalid Refresh Token',
    );

    txMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-2',
      tokenHash,
      sessionId: 'session-2',
      familyId: 'family-2',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: {
        id: 'session-2',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
        user: { id: 'user-1', email: 'user@example.com' },
      },
    });

    await expect(service.rotate(token)).rejects.toThrow(
      'Invalid Refresh Token',
    );
    expect(txMock.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(txMock.session.updateMany).not.toHaveBeenCalled();
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects rotation when the token is expired', async () => {
    const token = 'expired-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    txMock.refreshToken.findUnique.mockResolvedValue({
      id: 'token-1',
      tokenHash,
      sessionId: 'session-1',
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      session: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: { id: 'user-1', email: 'user@example.com' },
      },
    });

    await expect(service.rotate(token)).rejects.toThrow(
      'Invalid Refresh Token',
    );
    expect(txMock.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(txMock.session.updateMany).not.toHaveBeenCalled();
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes a token family and session when token reuse is detected', async () => {
    const token = 'reused-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const oldTokenRecord = {
      id: 'token-1',
      tokenHash,
      sessionId: 'session-1',
      familyId: 'family-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      },
    };

    txMock.refreshToken.findUnique.mockResolvedValue(oldTokenRecord);
    txMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    txMock.session.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.rotate(token)).rejects.toThrow(
      'Refresh Token Reuse Detected',
    );

    expect(txMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date) as Date,
      },
    });
    expect(txMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date) as Date,
      },
    });
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('logs out by revoking the token session and all active tokens in it', async () => {
    const token = 'logout-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    txMock.refreshToken.findUnique.mockResolvedValue({
      sessionId: 'session-1',
    });
    txMock.session.updateMany.mockResolvedValue({ count: 1 });
    txMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.logout(token)).resolves.toBeUndefined();

    expect(txMock.refreshToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash,
      },
      select: {
        sessionId: true,
      },
    });
    expect(txMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date) as Date,
      },
    });
    expect(txMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        sessionId: 'session-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date) as Date,
      },
    });
  });

  it('does not revoke anything on logout when the token is missing', async () => {
    txMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.logout('missing-token')).resolves.toBeUndefined();

    expect(txMock.session.updateMany).not.toHaveBeenCalled();
    expect(txMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
