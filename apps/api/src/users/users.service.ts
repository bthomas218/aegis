import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  UserCreateInput,
  UserSelect,
  UserUpdateInput,
  UserWhereInput,
} from 'src/generated/prisma/models';
import { ListUsersDTO } from './dto/list-users.dto';

const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUser: UserCreateInput) {
    try {
      const user = await this.prisma.user.create({
        data: createUser,
        select: publicUserSelect,
      });
      return user;
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('User already exists');
      }
      throw err;
    }
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    return user;
  }

  async findAll(listUsersDto: ListUsersDTO) {
    const { page, limit, role, search } = listUsersDto;
    const skip = (page - 1) * limit;

    const where: UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, totalItems] = await this.prisma.$transaction(async (tx) => {
      return [
        await tx.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: publicUserSelect,
        }),
        await tx.user.count({ where }),
      ];
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async update(id: string, updateUser: UserUpdateInput) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id,
        },
        data: updateUser,
        select: publicUserSelect,
      });
      return user;
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User Not Found');
      }
      throw err;
    }
  }

  async delete(id: string) {
    try {
      const user = await this.prisma.user.delete({
        where: {
          id,
        },
        select: publicUserSelect,
      });
      return user;
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User Not Found');
      }
      throw err;
    }
  }
}
