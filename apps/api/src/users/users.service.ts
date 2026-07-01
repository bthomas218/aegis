import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  UserCreateInput,
  UserUpdateInput,
  UserWhereInput,
} from 'src/generated/prisma/models';
import { ListUsersDTO } from './dto/list-users.dto';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import { PRISMA_QUERY } from 'src/common/constants/database-query.constants';
import { PRISMA_ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PUBLIC_USER_SELECT } from './users.constants';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUser: UserCreateInput) {
    try {
      const user = await this.prisma.user.create({
        data: createUser,
        select: PUBLIC_USER_SELECT,
      });
      return user;
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        throw new ConflictException(ERROR_MESSAGES.USER_ALREADY_EXISTS);
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
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async findAll(listUsersDto: ListUsersDTO) {
    const { page, limit, role, search } = listUsersDto;
    const skip = (page - 1) * limit;

    const where: UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? { email: { contains: search, mode: PRISMA_QUERY.INSENSITIVE } }
        : {}),
    };

    const [data, totalItems] = await this.prisma.$transaction(async (tx) => {
      return [
        await tx.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [PRISMA_QUERY.CREATED_AT_FIELD]: PRISMA_QUERY.DESC },
          select: PUBLIC_USER_SELECT,
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
        select: PUBLIC_USER_SELECT,
      });
      return user;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
          case PRISMA_ERROR_CODES.RECORD_NOT_FOUND:
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new ConflictException(ERROR_MESSAGES.USER_ALREADY_EXISTS);
          default:
            throw err;
        }
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
        select: PUBLIC_USER_SELECT,
      });
      return user;
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      ) {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      throw err;
    }
  }
}
