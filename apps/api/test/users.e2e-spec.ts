import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import type { User } from '../src/generated/prisma/client';
import { UserRoles } from '../src/generated/prisma/enums';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('UsersModule (e2e)', () => {
  const jwtSecret = 'test-jwt-secret';
  const user: User = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    role: UserRoles.USER,
    createdAt: new Date('2026-06-30T12:00:00.000Z'),
    updatedAt: new Date('2026-06-30T12:30:00.000Z'),
  };
  const admin: User = {
    ...user,
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRoles.ADMIN,
  };
  const systemAdmin: User = {
    ...user,
    id: 'system-admin-1',
    email: 'system-admin@example.com',
    role: UserRoles.SYSTEM_ADMIN,
  };
  const users = new Map([
    [user.id, user],
    [admin.id, admin],
    [systemAdmin.id, systemAdmin],
  ]);
  const usersServiceMock = {
    findById: jest.fn<Promise<User>, [string]>(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
    usersServiceMock.findById.mockImplementation((id: string) => {
      const foundUser = users.get(id);

      if (!foundUser) {
        return Promise.reject(new Error('User Not Found'));
      }

      return Promise.resolve(foundUser);
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the authenticated user profile', async () => {
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

  it('allows an admin to find a user by id', async () => {
    const accessToken = await jwt.signAsync({
      sub: `aegis|${admin.id}`,
      email: admin.email,
      role: admin.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });

    expect(usersServiceMock.findById).toHaveBeenCalledWith(admin.id);
    expect(usersServiceMock.findById).toHaveBeenCalledWith(user.id);
  });

  it('allows an admin to list users', async () => {
    const response = {
      data: [user],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 5,
        totalPages: 1,
        currentPage: 2,
      },
    };
    const accessToken = await jwt.signAsync({
      sub: `aegis|${admin.id}`,
      email: admin.email,
      role: admin.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    usersServiceMock.findAll.mockResolvedValue(response);

    await request(server)
      .get('/admin/users')
      .query({ page: '2', limit: '5', search: 'test', role: UserRoles.USER })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        data: [
          {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        ],
        meta: response.meta,
      });

    expect(usersServiceMock.findAll).toHaveBeenCalledWith({
      page: '2',
      limit: '5',
      search: 'test',
      role: UserRoles.USER,
    });
  });

  it('rejects a regular user from admin routes', async () => {
    const accessToken = await jwt.signAsync({
      sub: `aegis|${user.id}`,
      email: user.email,
      role: user.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(usersServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('allows a system admin to create a user', async () => {
    const createUser = {
      email: 'new@example.com',
      password_hash: 'hash456',
      role: UserRoles.ADMIN,
    };
    const createdUser: User = {
      ...user,
      id: 'user-2',
      email: createUser.email,
      password_hash: createUser.password_hash,
      role: createUser.role,
    };
    const accessToken = await jwt.signAsync({
      sub: `aegis|${systemAdmin.id}`,
      email: systemAdmin.email,
      role: systemAdmin.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    usersServiceMock.create.mockResolvedValue(createdUser);

    await request(server)
      .post('/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createUser)
      .expect(201)
      .expect({
        id: createdUser.id,
        email: createdUser.email,
        password_hash: createdUser.password_hash,
        role: createdUser.role,
        createdAt: createdUser.createdAt.toISOString(),
        updatedAt: createdUser.updatedAt.toISOString(),
      });

    expect(usersServiceMock.create).toHaveBeenCalledWith(createUser);
  });

  it('allows a system admin to update a user', async () => {
    const updateUser = {
      email: 'updated@example.com',
      role: UserRoles.ADMIN,
    };
    const updatedUser: User = {
      ...user,
      email: updateUser.email,
      role: updateUser.role,
    };
    const accessToken = await jwt.signAsync({
      sub: `aegis|${systemAdmin.id}`,
      email: systemAdmin.email,
      role: systemAdmin.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    usersServiceMock.update.mockResolvedValue(updatedUser);

    await request(server)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateUser)
      .expect(200)
      .expect({
        id: updatedUser.id,
        email: updatedUser.email,
        password_hash: updatedUser.password_hash,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      });

    expect(usersServiceMock.update).toHaveBeenCalledWith(user.id, updateUser);
  });

  it('allows a system admin to delete a user', async () => {
    const accessToken = await jwt.signAsync({
      sub: `aegis|${systemAdmin.id}`,
      email: systemAdmin.email,
      role: systemAdmin.role,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    usersServiceMock.delete.mockResolvedValue(user);

    await request(server)
      .delete(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });

    expect(usersServiceMock.delete).toHaveBeenCalledWith(user.id);
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
