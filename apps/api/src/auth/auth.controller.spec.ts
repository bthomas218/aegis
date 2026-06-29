import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    register: jest.fn<Promise<{ acess_token: string }>, [CredentialsDTO]>(),
    login: jest.fn<Promise<{ acess_token: string }>, [CredentialsDTO]>(),
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
    const response = { acess_token: 'registered-token' };

    authServiceMock.register.mockResolvedValue(response);

    await expect(controller.register(credentials)).resolves.toEqual(response);
    expect(authServiceMock.register).toHaveBeenCalledWith(credentials);
  });

  it('logs in a user by delegating to the auth service', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'password123',
    };
    const response = { acess_token: 'login-token' };

    authServiceMock.login.mockResolvedValue(response);

    await expect(controller.login(credentials)).resolves.toEqual(response);
    expect(authServiceMock.login).toHaveBeenCalledWith(credentials);
  });
});
