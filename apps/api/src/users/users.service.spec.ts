import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserCreateInput } from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

interface MockUser {
  id: string;
  email: string;
  password_hash?: string | null;
}

describe('UsersService', () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a user and returns it', async () => {
    const createUserDto: UserCreateInput = {
      email: 'test@example.com',
      password_hash: 'hash123',
    };
    const createdUser: MockUser = { id: 'user-1', ...createUserDto };

    prismaMock.user.create.mockResolvedValue(createdUser);

    await expect(service.create(createUserDto)).resolves.toEqual(createdUser);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: createUserDto,
    });
  });

  it('throws ConflictException when a duplicate user is created', async () => {
    const createUserDto: UserCreateInput = {
      email: 'duplicate@example.com',
      password_hash: 'hash123',
    };
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test-client',
      },
    );

    prismaMock.user.create.mockRejectedValue(prismaError);

    await expect(service.create(createUserDto)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.create(createUserDto)).rejects.toThrow(
      'User already exists',
    );
  });

  it('finds a user by email', async () => {
    const user: MockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hash123',
    };

    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail('test@example.com')).resolves.toEqual(
      user,
    );
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('throws NotFoundException when no user exists for the email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findByEmail('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.findByEmail('missing@example.com')).rejects.toThrow(
      'User Not Found',
    );
  });

  it('finds a user by id', async () => {
    const user: MockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'hash123',
    };

    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findById('user-1')).resolves.toEqual(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('throws NotFoundException when no user exists for the id', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.findById('missing-user')).rejects.toThrow(
      'User Not Found',
    );
  });

  it('updates a password hash and returns the updated user', async () => {
    const updatedUser: MockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'newhash456',
    };

    prismaMock.user.update.mockResolvedValue(updatedUser);

    await expect(
      service.updatePasswordHash('newhash456', 'user-1'),
    ).resolves.toEqual(updatedUser);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1', email: undefined },
      data: { password_hash: 'newhash456' },
    });
  });
});
