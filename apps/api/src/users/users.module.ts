import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersController } from './users.controller';
import { AdminController } from './admin/admin.controller';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Module({
  imports: [],
  providers: [UsersService, PrismaService, RolesGuard, JwtAuthGuard],
  exports: [UsersService],
  controllers: [UsersController, AdminController],
})
export class UsersModule {}
