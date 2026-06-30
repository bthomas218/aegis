import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
