import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('UsersModule (e2e)', () => {
  const jwtSecret = 'test-jwt-secret';
  const userRole = 'USER';
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    role: userRole,
    createdAt: new Date('2026-06-30T12:00:00.000Z'),
    updatedAt: new Date('2026-06-30T12:30:00.000Z'),
  };
  const usersServiceMock = {
    findById: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn(() => jwtSecret),
  };
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, UsersModule],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    jwt = new JwtService({ secret: jwtSecret });

    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the authenticated user profile', async () => {
    usersServiceMock.findById.mockResolvedValue(user);

    const accessToken = await jwt.signAsync({
      sub: `aegis|${user.id}`,
      email: user.email,
      role: user.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        role: user.role,
      });

    expect(usersServiceMock.findById).toHaveBeenCalledWith(user.id);
  });

  it('rejects requests without a bearer token', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get('/users/me').expect(401);
    expect(usersServiceMock.findById).not.toHaveBeenCalled();
  });

  it('rejects tokens with an invalid subject prefix', async () => {
    const accessToken = await jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expect(usersServiceMock.findById).not.toHaveBeenCalled();
  });
});
