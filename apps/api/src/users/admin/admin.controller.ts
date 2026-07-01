import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { UserRoles } from 'src/generated/prisma/enums';
import { ListUsersDTO } from '../dto/list-users.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';

@Controller('admin/users')
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.SYSTEM_ADMIN)
  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.users.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.SYSTEM_ADMIN)
  @Get()
  async findAll(@Query() listUsers: ListUsersDTO) {
    return await this.users.findAll(listUsers);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.SYSTEM_ADMIN)
  @Post()
  async create(@Body() createUser: CreateUserDTO) {
    return await this.users.create(createUser);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.SYSTEM_ADMIN)
  async update(@Param('id') id: string, @Body() updateUser: UpdateUserDTO) {
    return await this.users.update(id, updateUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.SYSTEM_ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.users.delete(id);
  }
}
