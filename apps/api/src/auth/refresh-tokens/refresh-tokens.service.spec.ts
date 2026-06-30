import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import crypto from 'node:crypto';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokensService } from './refresh-tokens.service';

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;

  type TransactionMock = {
    refreshToken: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
      create: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };

  type TransactionCallback = (tx: TransactionMock) => Promise<unknown>;

  const prismaServiceMock: {
    refreshToken: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  } = {
    refreshToken: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      updateMany: jest.fn<Promise<unknown>, [unknown]>(),
    },
    $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
  };

  let txMock: TransactionMock;

  beforeEach(async () => {
    txMock = {
      refreshToken: {
        findUnique: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };

    prismaServiceMock.refreshToken.create.mockReset();
    prismaServiceMock.refreshToken.findUnique.mockReset();
    prismaServiceMock.refreshToken.updateMany.mockReset();
    prismaServiceMock.$transaction.mockReset();
    prismaServiceMock.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<RefreshTokensService>(RefreshTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a refresh token and stores a hashed copy for the user', async () => {
    prismaServiceMock.refreshToken.create.mockResolvedValue({ id: 'token-1' });

    const token = await service.create('user-1');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    expect(token).toEqual(expect.any(String));

    const createArgs = prismaServiceMock.refreshToken.create.mock
      .calls[0]?.[0] as {
      data: {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
      };
    };

    expect(createArgs.data.tokenHash).toBe(tokenHash);
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
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
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    };

    txMock.refreshToken.findUnique.mockResolvedValue(oldTokenRecord);
    txMock.refreshToken.update.mockResolvedValue({});
    txMock.refreshToken.create.mockResolvedValue({});

    const result = await service.rotate(token);

    expect(result).toMatchObject({
      user: oldTokenRecord.user,
    });
    expect(typeof result.newToken).toBe('string');

    const findUniqueArgs = txMock.refreshToken.findUnique.mock
      .calls[0]?.[0] as {
      where: { tokenHash: string };
      include: { user: true };
    };
    expect(findUniqueArgs.where.tokenHash).toBe(tokenHash);
    expect(findUniqueArgs.include).toEqual({ user: true });

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
        userId: string;
      };
    };
    expect(typeof createArgs.data.tokenHash).toBe('string');
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    expect(createArgs.data.userId).toBe('user-1');
  });

  it('rejects rotation when the token is invalid', async () => {
    const token = 'expired-token';

    txMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.rotate(token)).rejects.toThrow(UnauthorizedException);
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });
});
