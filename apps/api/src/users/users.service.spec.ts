import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { User } from 'src/generated/prisma/client';
import { UserRoles } from 'src/generated/prisma/enums';
import type {
  UserCreateInput,
  UserSelect,
  UserUpdateInput,
  UserWhereInput,
} from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListUsersDTO } from './dto/list-users.dto';
import { UsersService } from './users.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('UsersService', () => {
  const createdAt = new Date('2026-06-30T12:00:00.000Z');
  const updatedAt = new Date('2026-06-30T12:30:00.000Z');
  const user: User = {
    id: 'user-1',
    email: 'test@example.com',
    password_hash: 'hash123',
    role: UserRoles.USER,
    createdAt,
    updatedAt,
  };
  const publicUserSelect = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } satisfies UserSelect;
  const transactionMock = {
    user: {
      findMany: jest.fn<
        Promise<User[]>,
        [
          {
            where: UserWhereInput;
            skip: number;
            take: number;
            orderBy: { createdAt: 'desc' };
            select: UserSelect;
          },
        ]
      >(),
      count: jest.fn<Promise<number>, [{ where: UserWhereInput }]>(),
    },
  };
  const prismaMock = {
    user: {
      create: jest.fn<
        Promise<User>,
        [{ data: UserCreateInput; select: UserSelect }]
      >(),
      findUnique: jest.fn<
        Promise<User | null>,
        | [{ where: { email: string } }]
        | [{ where: { id: string }; select: UserSelect }]
      >(),
      update: jest.fn<
        Promise<User>,
        [{ where: { id: string }; data: UserUpdateInput; select: UserSelect }]
      >(),
      delete: jest.fn<
        Promise<User>,
        [{ where: { id: string }; select: UserSelect }]
      >(),
    },
    $transaction: jest.fn<
      Promise<[User[], number]>,
      [(tx: typeof transactionMock) => Promise<[User[], number]>]
    >(),
  };
  let service: UsersService;

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
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transactionMock),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a user and returns it', async () => {
    const createUser: UserCreateInput = {
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
    };

    prismaMock.user.create.mockResolvedValue(user);

    await expect(service.create(createUser)).resolves.toEqual(user);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: createUser,
      select: publicUserSelect,
    });
  });

  it('throws ConflictException when a duplicate user is created', async () => {
    const createUser: UserCreateInput = {
      email: user.email,
      password_hash: user.password_hash,
    };
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test-client',
      },
    );

    prismaMock.user.create.mockRejectedValue(prismaError);

    await expect(service.create(createUser)).rejects.toThrow(ConflictException);
    await expect(service.create(createUser)).rejects.toThrow(
      'User already exists',
    );
  });

  it('finds a user by email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail(user.email)).resolves.toEqual(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: user.email },
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
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findById(user.id)).resolves.toEqual(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: publicUserSelect,
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

  it('finds paginated users by role and email search', async () => {
    const listUsersDto: ListUsersDTO = {
      page: 2,
      limit: 10,
      role: UserRoles.USER,
      search: 'test',
    };
    const where: UserWhereInput = {
      role: UserRoles.USER,
      email: { contains: listUsersDto.search, mode: 'insensitive' },
    };

    transactionMock.user.findMany.mockResolvedValue([user]);
    transactionMock.user.count.mockResolvedValue(11);

    await expect(service.findAll(listUsersDto)).resolves.toEqual({
      data: [user],
      meta: {
        totalItems: 11,
        itemCount: 1,
        itemsPerPage: listUsersDto.limit,
        totalPages: 2,
        currentPage: listUsersDto.page,
      },
    });
    expect(transactionMock.user.findMany).toHaveBeenCalledWith({
      where,
      skip: 10,
      take: listUsersDto.limit,
      orderBy: { createdAt: 'desc' },
      select: publicUserSelect,
    });
    expect(transactionMock.user.count).toHaveBeenCalledWith({ where });
  });

  it('uses ListUsersDTO defaults when finding users', async () => {
    const listUsersDto = new ListUsersDTO();

    transactionMock.user.findMany.mockResolvedValue([user]);
    transactionMock.user.count.mockResolvedValue(1);

    await expect(service.findAll(listUsersDto)).resolves.toEqual({
      data: [user],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: listUsersDto.limit,
        totalPages: 1,
        currentPage: listUsersDto.page,
      },
    });
    expect(transactionMock.user.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: listUsersDto.limit,
      orderBy: { createdAt: 'desc' },
      select: publicUserSelect,
    });
    expect(transactionMock.user.count).toHaveBeenCalledWith({ where: {} });
  });

  it('updates a user and returns it', async () => {
    const updateUser: UserUpdateInput = {
      email: 'updated@example.com',
      role: UserRoles.ADMIN,
    };
    const updatedUser: User = {
      ...user,
      email: 'updated@example.com',
      role: UserRoles.ADMIN,
    };

    prismaMock.user.update.mockResolvedValue(updatedUser);

    await expect(service.update(user.id, updateUser)).resolves.toEqual(
      updatedUser,
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: updateUser,
      select: publicUserSelect,
    });
  });

  it('throws NotFoundException when updating a missing user', async () => {
    const prismaError = new PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test-client',
    });

    prismaMock.user.update.mockRejectedValue(prismaError);

    await expect(service.update('missing-user', {})).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.update('missing-user', {})).rejects.toThrow(
      'User Not Found',
    );
  });

  it('throws ConflictException when updating to an email that already exists', async () => {
    const updateUser: UserUpdateInput = {
      email: 'existing@example.com',
    };
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test-client',
      },
    );

    prismaMock.user.update.mockRejectedValue(prismaError);

    await expect(service.update(user.id, updateUser)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.update(user.id, updateUser)).rejects.toThrow(
      'User already exists',
    );
  });

  it('deletes a user and returns it', async () => {
    prismaMock.user.delete.mockResolvedValue(user);

    await expect(service.delete(user.id)).resolves.toEqual(user);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: user.id },
      select: publicUserSelect,
    });
  });

  it('throws NotFoundException when deleting a missing user', async () => {
    const prismaError = new PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test-client',
    });

    prismaMock.user.delete.mockRejectedValue(prismaError);

    await expect(service.delete('missing-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.delete('missing-user')).rejects.toThrow(
      'User Not Found',
    );
  });
});
