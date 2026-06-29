import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserCreateInput } from 'src/generated/prisma/models';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: UserCreateInput) {
    try {
      const user = await this.prisma.user.create({
        data: createUserDto,
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
    });

    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    return user;
  }

  async updatePasswordHash(password_hash: string, id?: string, email?: string) {
    const user = await this.prisma.user.update({
      where: {
        id,
        email,
      },
      data: {
        password_hash,
      },
    });
    if (!user) {
      throw new NotFoundException('User Not Found');
    }

    return user;
  }
}
