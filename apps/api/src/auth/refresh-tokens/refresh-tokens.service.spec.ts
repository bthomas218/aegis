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
  const prismaServiceMock = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let txMock: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    txMock = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    prismaServiceMock.refreshToken.create.mockReset();
    prismaServiceMock.refreshToken.findUnique.mockReset();
    prismaServiceMock.refreshToken.updateMany.mockReset();
    prismaServiceMock.$transaction.mockReset();
    prismaServiceMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
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
    expect(prismaServiceMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash,
        userId: 'user-1',
        expiresAt: expect.any(Date),
      },
    });
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

    expect(prismaServiceMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
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

    await expect(service.rotate(token)).resolves.toEqual({
      user: oldTokenRecord.user,
      newToken: expect.any(String),
    });

    expect(txMock.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash },
      include: { user: true },
    });
    expect(txMock.refreshToken.update).toHaveBeenCalledWith({
      where: { tokenHash },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(txMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        userId: 'user-1',
      },
    });
  });

  it('rejects rotation when the token is invalid', async () => {
    const token = 'expired-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    txMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.rotate(token)).rejects.toThrow(UnauthorizedException);
    expect(txMock.refreshToken.update).not.toHaveBeenCalled();
    expect(txMock.refreshToken.create).not.toHaveBeenCalled();
  });
});
