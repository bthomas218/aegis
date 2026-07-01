import { Test, TestingModule } from '@nestjs/testing';
import * as tokenUtils from 'src/utils/token-utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResetTokensService } from './reset-tokens.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('src/utils/token-utils', () => ({
  generateRandomToken: jest.fn(),
  hashToken: jest.fn(),
}));

describe('ResetTokensService', () => {
  let service: ResetTokensService;
  const prismaServiceMock: {
    passwordResetToken: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
  } = {
    passwordResetToken: {
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      update: jest.fn<Promise<unknown>, [unknown]>(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetTokensService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ResetTokensService>(ResetTokensService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a reset token by storing only its hash', async () => {
    (
      tokenUtils.generateRandomToken as jest.MockedFunction<
        typeof tokenUtils.generateRandomToken
      >
    ).mockReturnValue('opaque-token');
    (
      tokenUtils.hashToken as jest.MockedFunction<typeof tokenUtils.hashToken>
    ).mockReturnValue('hashed-token');
    prismaServiceMock.passwordResetToken.create.mockResolvedValue({
      id: 'reset-token-1',
    });

    await expect(service.create('user-1')).resolves.toBe('opaque-token');

    const createArgs = prismaServiceMock.passwordResetToken.create.mock
      .calls[0]?.[0] as {
      data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
      };
    };

    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.tokenHash).toBe('hashed-token');
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
  });

  it('finds a reset token by hashing the opaque token', async () => {
    const resetToken = {
      id: 'reset-token-1',
      tokenHash: 'hashed-token',
    };

    (
      tokenUtils.hashToken as jest.MockedFunction<typeof tokenUtils.hashToken>
    ).mockReturnValue('hashed-token');
    prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue(
      resetToken,
    );

    await expect(service.find('opaque-token')).resolves.toEqual(resetToken);
    expect(
      prismaServiceMock.passwordResetToken.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        tokenHash: 'hashed-token',
      },
    });
  });

  it('marks a reset token as used', async () => {
    prismaServiceMock.passwordResetToken.update.mockResolvedValue({
      id: 'reset-token-1',
    });

    await expect(service.markUsed('reset-token-1')).resolves.toBeUndefined();

    const updateArgs = prismaServiceMock.passwordResetToken.update.mock
      .calls[0]?.[0] as {
      where: { id: string };
      data: { usedAt: Date };
    };

    expect(updateArgs.where.id).toBe('reset-token-1');
    expect(updateArgs.data.usedAt).toBeInstanceOf(Date);
  });
});
