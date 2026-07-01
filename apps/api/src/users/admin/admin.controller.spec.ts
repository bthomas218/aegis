import { Test, TestingModule } from '@nestjs/testing';
import type { User } from 'src/generated/prisma/client';
import { UserRoles } from 'src/generated/prisma/enums';
import type {
  UserCreateInput,
  UserUpdateInput,
} from 'src/generated/prisma/models';
import type { CreateUserDTO } from '../dto/create-user.dto';
import type { UpdateUserDTO } from '../dto/update-user.dto';
import { UsersService } from '../users.service';
import { AdminController } from './admin.controller';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AdminController', () => {
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
  const usersServiceMock = {
    findById: jest.fn<Promise<User>, [string]>(),
    findAll: jest.fn<
      Promise<{
        data: User[];
        meta: {
          totalItems: number;
          itemCount: number;
          itemsPerPage: number;
          totalPages: number;
          currentPage: number;
        };
      }>,
      [
        {
          page: number;
          limit: number;
          search?: string;
          role?: UserRoles;
        },
      ]
    >(),
    create: jest.fn<Promise<User>, [UserCreateInput]>(),
    update: jest.fn<Promise<User>, [string, UserUpdateInput]>(),
    delete: jest.fn<Promise<User>, [string]>(),
  };
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('finds a user by id', async () => {
    usersServiceMock.findById.mockResolvedValue(user);

    await expect(controller.find(user.id)).resolves.toEqual(user);
    expect(usersServiceMock.findById).toHaveBeenCalledWith(user.id);
  });

  it('finds users with list filters', async () => {
    const listUsers = {
      page: 2,
      limit: 5,
      search: 'test',
      role: UserRoles.USER,
    };
    const response = {
      data: [user],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: listUsers.limit,
        totalPages: 1,
        currentPage: listUsers.page,
      },
    };

    usersServiceMock.findAll.mockResolvedValue(response);

    await expect(controller.findAll(listUsers)).resolves.toEqual(response);
    expect(usersServiceMock.findAll).toHaveBeenCalledWith(listUsers);
  });

  it('creates a user', async () => {
    const createUser: CreateUserDTO = {
      email: 'new@example.com',
      password_hash: 'hash456',
      role: UserRoles.ADMIN,
    };
    const createdUser: User = {
      ...user,
      id: 'user-2',
      email: createUser.email,
      password_hash: 'hash456',
      role: UserRoles.ADMIN,
    };

    usersServiceMock.create.mockResolvedValue(createdUser);

    await expect(controller.create(createUser)).resolves.toEqual(createdUser);
    expect(usersServiceMock.create).toHaveBeenCalledWith(createUser);
  });

  it('updates a user', async () => {
    const updateUser: UpdateUserDTO = {
      email: 'updated@example.com',
      role: UserRoles.ADMIN,
    };
    const updatedUser: User = {
      ...user,
      email: 'updated@example.com',
      role: UserRoles.ADMIN,
    };

    usersServiceMock.update.mockResolvedValue(updatedUser);

    await expect(controller.update(user.id, updateUser)).resolves.toEqual(
      updatedUser,
    );
    expect(usersServiceMock.update).toHaveBeenCalledWith(user.id, updateUser);
  });

  it('deletes a user by id', async () => {
    usersServiceMock.delete.mockResolvedValue(user);

    await expect(controller.delete(user.id)).resolves.toEqual(user);
    expect(usersServiceMock.delete).toHaveBeenCalledWith(user.id);
  });
});
