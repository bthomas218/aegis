import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import type { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';
import { RefreshTokensService } from './refresh-tokens/refresh-tokens.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  const userRole = 'USER';
  let service: AuthService;
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
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in a validated user and returns an access token', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: userRole,
    } as User;

    jwtServiceMock.signAsync.mockResolvedValue('signed-token');
    refreshTokensServiceMock.create.mockResolvedValue('refresh-token');

    await expect(service.login(user)).resolves.toEqual({
      accessToken: 'signed-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'aegis|user-1',
      email: user.email,
      role: userRole,
    });
    expect(refreshTokensServiceMock.create).toHaveBeenCalledWith('user-1');
  });

  it('validates a user when credentials are valid', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'password123',
    };
    const user = {
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
      role: userRole,
    } as User;

    usersServiceMock.findByEmail.mockResolvedValue(user);
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);

    await expect(service.validateUser(credentials)).resolves.toEqual(user);
    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
      credentials.email,
    );
    expect(argon2.verify).toHaveBeenCalledWith(
      user.password_hash,
      credentials.password,
    );
  });

  it('returns null when validating credentials for a missing user', async () => {
    const credentials: CredentialsDTO = {
      email: 'missing@example.com',
      password: 'password123',
    };

    usersServiceMock.findByEmail.mockResolvedValue(null);

    await expect(service.validateUser(credentials)).resolves.toBeNull();
  });

  it('returns null when validating credentials with an invalid password', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'wrong-password',
    };
    const user = {
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
      role: userRole,
    } as User;

    usersServiceMock.findByEmail.mockResolvedValue(user);
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(false);

    await expect(service.validateUser(credentials)).resolves.toBeNull();
  });

  it('registers a user by hashing the password and logging them in', async () => {
    const credentials: CredentialsDTO = {
      email: 'new@example.com',
      password: 'password123',
    };
    const createdUser = {
      id: 'user-2',
      email: credentials.email,
      password_hash: 'hashed-password',
      role: userRole,
    } as User;

    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      'hashed-password',
    );
    usersServiceMock.create.mockResolvedValue(createdUser);
    jwtServiceMock.signAsync.mockResolvedValue('signed-token');
    refreshTokensServiceMock.create.mockResolvedValue('refresh-token');

    await expect(service.register(credentials)).resolves.toEqual({
      accessToken: 'signed-token',
      refreshToken: 'refresh-token',
    });

    expect(argon2.hash).toHaveBeenCalledWith(credentials.password);
    expect(usersServiceMock.create).toHaveBeenCalledWith({
      email: credentials.email,
      password_hash: 'hashed-password',
    });
    expect(refreshTokensServiceMock.create).toHaveBeenCalledWith('user-2');
  });

  it('rotates a refresh token and returns a new access and refresh token', async () => {
    const user = {
      id: 'user-3',
      email: 'rotated@example.com',
      role: userRole,
    } as User;

    refreshTokensServiceMock.rotate.mockResolvedValue({
      user,
      newToken: 'new-refresh-token',
    });
    jwtServiceMock.signAsync.mockResolvedValue('rotated-token');

    await expect(service.refresh('old-refresh-token')).resolves.toEqual({
      accessToken: 'rotated-token',
      refreshToken: 'new-refresh-token',
    });

    expect(refreshTokensServiceMock.rotate).toHaveBeenCalledWith(
      'old-refresh-token',
    );
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'aegis|user-3',
      email: 'rotated@example.com',
      role: userRole,
    });
  });

  it('logs out a user by revoking the refresh token', async () => {
    refreshTokensServiceMock.revoke.mockResolvedValue(undefined);

    await expect(service.logout('refresh-token')).resolves.toBeUndefined();

    expect(refreshTokensServiceMock.revoke).toHaveBeenCalledWith(
      'refresh-token',
    );
  });
});
