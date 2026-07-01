import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PasswordResetLinkService } from '../src/auth/password-reset-link.service';
import { RefreshTokensService } from '../src/auth/refresh-tokens/refresh-tokens.service';
import { ResetTokensService } from '../src/auth/reset-tokens/reset-tokens.service';
import { LocalStrategy } from '../src/auth/strategies/local.strategy';
import { PrismaService } from '../src/prisma/prisma.service';
import { SessionsService } from '../src/sessions/sessions.service';
import { UsersService } from '../src/users/users.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthController (e2e)', () => {
  const userRole = 'USER';
  let app: INestApplication;
  const usersServiceMock = {
    create: jest.fn(),
    findByEmail: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const refreshTokensServiceMock = {
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    logout: jest.fn(),
  };
  const resetTokensServiceMock = {
    create: jest.fn(),
    find: jest.fn(),
    markUsed: jest.fn(),
  };
  const sessionsServiceMock = {
    revokeAll: jest.fn(),
  };
  const passwordResetLinkServiceMock = {
    send: jest.fn(),
    getLastToken: jest.fn(),
  };
  const txMock = {
    user: {
      update: jest.fn(),
    },
    passwordResetToken: {
      update: jest.fn(),
    },
  };
  const prismaServiceMock = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    prismaServiceMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: RefreshTokensService,
          useValue: refreshTokensServiceMock,
        },
        {
          provide: ResetTokensService,
          useValue: resetTokensServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
        {
          provide: PasswordResetLinkService,
          useValue: passwordResetLinkServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    jest.clearAllMocks();
    prismaServiceMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers a user and returns an access token', async () => {
    const credentials = {
      email: 'new@example.com',
      password: 'password123',
    };

    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      'hashed-password',
    );
    usersServiceMock.create.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
      role: userRole,
    });
    refreshTokensServiceMock.create.mockResolvedValue('refresh-token');
    jwtServiceMock.signAsync.mockResolvedValue('signed-token');

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/register')
      .send(credentials)
      .expect(201)
      .expect({ accessToken: 'signed-token', refreshToken: 'refresh-token' });
  });

  it('logs in an existing user and returns an access token', async () => {
    const credentials = {
      email: 'existing@example.com',
      password: 'password123',
    };

    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: credentials.email,
      password_hash: 'hashed-password',
      role: userRole,
    });
    refreshTokensServiceMock.create.mockResolvedValue('refresh-token');
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('login-token');

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/login')
      .send(credentials)
      .expect(200)
      .expect({ accessToken: 'login-token', refreshToken: 'refresh-token' });
  });

  it('refreshes a token pair and returns a new access and refresh token', async () => {
    refreshTokensServiceMock.rotate.mockResolvedValue({
      user: {
        id: 'user-3',
        email: 'refreshed@example.com',
        role: userRole,
      },
      newToken: 'new-refresh-token',
    });
    jwtServiceMock.signAsync.mockResolvedValue('refreshed-token');

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: 'old-refresh-token' })
      .expect(200)
      .expect({
        accessToken: 'refreshed-token',
        refreshToken: 'new-refresh-token',
      });
  });

  it('logs out by revoking the refresh token and returning no content', async () => {
    refreshTokensServiceMock.logout.mockResolvedValue(undefined);

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/logout')
      .send({ refreshToken: 'refresh-token' })
      .expect(204)
      .expect('');

    expect(refreshTokensServiceMock.logout).toHaveBeenCalledWith(
      'refresh-token',
    );
  });

  it('returns a generic response for forgot password requests', async () => {
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-4',
      email: 'reset@example.com',
      password_hash: 'hashed-password',
      role: userRole,
    });
    resetTokensServiceMock.create.mockResolvedValue('opaque-token');

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: 'reset@example.com' })
      .expect(200)
      .expect({
        message: 'If an account exists, a password reset link will be sent.',
      });

    expect(resetTokensServiceMock.create).toHaveBeenCalledWith('user-4');
    expect(passwordResetLinkServiceMock.send).toHaveBeenCalledWith(
      'reset@example.com',
      'opaque-token',
    );
  });

  it('keeps forgot password responses generic for missing users', async () => {
    usersServiceMock.findByEmail.mockRejectedValue(
      new NotFoundException('User Not Found'),
    );

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(200)
      .expect({
        message: 'If an account exists, a password reset link will be sent.',
      });
  });

  it('resets a password and returns no content', async () => {
    resetTokensServiceMock.find.mockResolvedValue({
      id: 'reset-token-1',
      userId: 'user-5',
      expiresAt: new Date(Date.now() + 1000 * 60),
      usedAt: null,
    });
    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      'new-password-hash',
    );

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/reset-password')
      .send({ token: 'opaque-token', newPassword: 'new-password' })
      .expect(204)
      .expect('');

    expect(resetTokensServiceMock.find).toHaveBeenCalledWith('opaque-token');
    expect(sessionsServiceMock.revokeAll).toHaveBeenCalledWith('user-5');
  });
});
