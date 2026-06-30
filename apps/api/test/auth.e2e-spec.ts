import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
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
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
    });
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('signed-token');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201)
      .expect({ acess_token: 'signed-token' });
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
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('login-token');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200)
      .expect({ acess_token: 'login-token' });
  });
});
