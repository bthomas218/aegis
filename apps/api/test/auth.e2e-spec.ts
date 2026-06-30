import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RefreshTokensService } from '../src/auth/refresh-tokens/refresh-tokens.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthController (e2e)', () => {
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
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {},
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
    });
    refreshTokensServiceMock.create.mockResolvedValue('refresh-token');
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
    });
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
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
    refreshTokensServiceMock.revoke.mockResolvedValue(undefined);

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/auth/logout')
      .send({ refreshToken: 'refresh-token' })
      .expect(204)
      .expect('');

    expect(refreshTokensServiceMock.revoke).toHaveBeenCalledWith(
      'refresh-token',
    );
  });
});
