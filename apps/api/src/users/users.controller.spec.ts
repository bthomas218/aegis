import { Test, TestingModule } from '@nestjs/testing';
import type { User } from 'src/generated/prisma/client';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const createdAt = new Date('2026-06-30T12:00:00.000Z');
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: 'hashed-password',
    role: 'USER',
    createdAt,
    updatedAt: new Date('2026-06-30T12:30:00.000Z'),
  } as User;
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the authenticated user profile', () => {
    const req = { user } as AuthenticatedRequest;

    expect(controller.me(req)).toEqual({
      id: user.id,
      email: user.email,
      createdAt,
      role: user.role,
    });
  });
});
