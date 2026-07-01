import { Test, TestingModule } from '@nestjs/testing';
import type { User } from 'src/generated/prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';
import { RefreshDTO } from './dto/refresh-dto';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
import type { Request } from 'express';

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('AuthController', () => {
  const userRole = 'USER';
  let controller: AuthController;
  const authServiceMock = {
    register: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [CredentialsDTO, string | undefined, string | undefined]
    >(),
    login: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [User, string | undefined, string | undefined]
    >(),
    refresh: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [string]
    >(),
    logout: jest.fn<Promise<void>, [string]>(),
    forgotPassword: jest.fn<Promise<void>, [string]>(),
    resetPassword: jest.fn<Promise<void>, [string, string]>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('registers a user by delegating to the auth service', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'password123',
    };
    const response = {
      accessToken: 'registered-token',
      refreshToken: 'registered-refresh-token',
    };
    const req = {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '10.0.0.1',
      },
    } as Request;

    authServiceMock.register.mockResolvedValue(response);

    await expect(controller.register(credentials, req)).resolves.toEqual(
      response,
    );
    expect(authServiceMock.register).toHaveBeenCalledWith(
      credentials,
      'Mozilla/5.0',
      '127.0.0.1',
    );
  });

  it('logs in a user by delegating to the auth service', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: userRole,
    } as User;
    const req = {
      user,
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '10.0.0.1',
      },
    } as AuthenticatedRequest;
    const response = {
      accessToken: 'login-token',
      refreshToken: 'login-refresh-token',
    };

    authServiceMock.login.mockResolvedValue(response);

    await expect(controller.login(req)).resolves.toEqual(response);
    expect(authServiceMock.login).toHaveBeenCalledWith(
      user,
      'Mozilla/5.0',
      '127.0.0.1',
    );
  });

  it('refreshes a token pair by delegating to the auth service', async () => {
    const refresh: RefreshDTO = {
      refreshToken: 'old-refresh-token',
    };
    const response = {
      accessToken: 'refreshed-token',
      refreshToken: 'new-refresh-token',
    };

    authServiceMock.refresh.mockResolvedValue(response);

    await expect(controller.refresh(refresh)).resolves.toEqual(response);
    expect(authServiceMock.refresh).toHaveBeenCalledWith(refresh.refreshToken);
  });

  it('logs out by delegating to the auth service', async () => {
    const refresh: RefreshDTO = {
      refreshToken: 'refresh-token',
    };

    authServiceMock.logout.mockResolvedValue(undefined);

    await expect(controller.logout(refresh)).resolves.toBeUndefined();
    expect(authServiceMock.logout).toHaveBeenCalledWith(refresh.refreshToken);
  });

  it('returns a generic response for forgot password requests', async () => {
    authServiceMock.forgotPassword.mockResolvedValue(undefined);

    await expect(
      controller.forgotPassword({ email: 'reset@example.com' }),
    ).resolves.toEqual({
      message: 'If an account exists, a password reset link will be sent.',
    });
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith(
      'reset@example.com',
    );
  });

  it('resets a password by delegating to the auth service', async () => {
    authServiceMock.resetPassword.mockResolvedValue(undefined);

    await expect(
      controller.resetPassword({
        token: 'opaque-token',
        newPassword: 'new-password',
      }),
    ).resolves.toBeUndefined();
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(
      'opaque-token',
      'new-password',
    );
  });
});
