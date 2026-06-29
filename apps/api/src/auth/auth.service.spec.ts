import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const usersServiceMock = {
    create: jest.fn(),
    findByEmail: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in a user and returns an access token when credentials are valid', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'password123',
    };
    const user = {
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
    } as User;

    usersServiceMock.findByEmail.mockResolvedValue(user);
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('signed-token');

    await expect(service.login(credentials)).resolves.toEqual({
      acess_token: 'signed-token',
    });

    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
      credentials.email,
    );
    expect(argon2.verify).toHaveBeenCalledWith(
      user.password_hash,
      credentials.password,
    );
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'aegis_user-1',
      email: credentials.email,
    });
  });

  it('throws UnauthorizedException when the user cannot be found', async () => {
    const credentials: CredentialsDTO = {
      email: 'missing@example.com',
      password: 'password123',
    };

    usersServiceMock.findByEmail.mockResolvedValue(null);

    await expect(service.login(credentials)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login(credentials)).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('throws UnauthorizedException when the password is invalid', async () => {
    const credentials: CredentialsDTO = {
      email: 'test@example.com',
      password: 'wrong-password',
    };
    const user = {
      id: 'user-1',
      email: credentials.email,
      password_hash: 'hashed-password',
    } as User;

    usersServiceMock.findByEmail.mockResolvedValue(user);
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(false);

    await expect(service.login(credentials)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login(credentials)).rejects.toThrow(
      'Invalid email or password',
    );
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
    } as User;

    (argon2.hash as jest.MockedFunction<typeof argon2.hash>).mockResolvedValue(
      'hashed-password',
    );
    usersServiceMock.create.mockResolvedValue(createdUser);
    usersServiceMock.findByEmail.mockResolvedValue(createdUser);
    (
      argon2.verify as jest.MockedFunction<typeof argon2.verify>
    ).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('signed-token');

    await expect(service.register(credentials)).resolves.toEqual({
      acess_token: 'signed-token',
    });

    expect(argon2.hash).toHaveBeenCalledWith(credentials.password);
    expect(usersServiceMock.create).toHaveBeenCalledWith({
      email: credentials.email,
      password_hash: 'hashed-password',
    });
  });
});
