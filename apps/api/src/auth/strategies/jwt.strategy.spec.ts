import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from 'src/generated/prisma/client';
import { UsersService } from 'src/users/users.service';
import type { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

jest.mock('src/users/users.service', () => ({
  UsersService: class UsersService {},
}));

describe('JwtStrategy', () => {
  const usersServiceMock = {
    findById: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configServiceMock as unknown as ConfigService,
      usersServiceMock as unknown as UsersService,
    );
  });

  it('returns the user for a valid token subject', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    } as User;
    const payload = {
      sub: 'aegis|user-1',
      email: user.email,
      role: user.role,
    } as JwtPayload;

    usersServiceMock.findById.mockResolvedValue(user);

    await expect(strategy.validate(payload)).resolves.toEqual(user);
    expect(usersServiceMock.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws UnauthorizedException for an invalid subject prefix', async () => {
    const payload = {
      sub: 'other|user-1',
      email: 'test@example.com',
      role: 'USER',
    } as JwtPayload;

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersServiceMock.findById).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the subject user no longer exists', async () => {
    const payload = {
      sub: 'aegis|missing-user',
      email: 'missing@example.com',
      role: 'USER',
    } as JwtPayload;

    usersServiceMock.findById.mockRejectedValue(
      new NotFoundException('User Not Found'),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
