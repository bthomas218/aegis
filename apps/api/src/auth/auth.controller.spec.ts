import { Test, TestingModule } from '@nestjs/testing';
import type { User } from 'src/generated/prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';
import { RefreshDTO } from './dto/refresh-dto';
import type { LoginRequest } from './types/login-request.type';

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('AuthController', () => {
  const userRole = 'USER';
  let controller: AuthController;
  const authServiceMock = {
    register: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [CredentialsDTO]
    >(),
    login: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [User]
    >(),
    refresh: jest.fn<
      Promise<{ accessToken: string; refreshToken: string }>,
      [string]
    >(),
    logout: jest.fn<Promise<void>, [string]>(),
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

    authServiceMock.register.mockResolvedValue(response);

    await expect(controller.register(credentials)).resolves.toEqual(response);
    expect(authServiceMock.register).toHaveBeenCalledWith(credentials);
  });

  it('logs in a user by delegating to the auth service', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: userRole,
    } as User;
    const req = { user } as LoginRequest;
    const response = {
      accessToken: 'login-token',
      refreshToken: 'login-refresh-token',
    };

    authServiceMock.login.mockResolvedValue(response);

    await expect(controller.login(req)).resolves.toEqual(response);
    expect(authServiceMock.login).toHaveBeenCalledWith(user);
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
});
