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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ROUTE_PARAMS } from 'src/common/constants/http.constants';
import { USERS_ROUTES } from '../users.constants';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { UserRoles } from 'src/generated/prisma/enums';
import { ListUsersDTO } from '../dto/list-users.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';

@Controller(USERS_ROUTES.ADMIN_ROOT)
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.SYSTEM_ADMIN)
  @Get(USERS_ROUTES.ID_PARAM)
  async find(@Param(ROUTE_PARAMS.ID, ParseUUIDPipe) id: string) {
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

  @Patch(USERS_ROUTES.ID_PARAM)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.SYSTEM_ADMIN)
  async update(
    @Param(ROUTE_PARAMS.ID, ParseUUIDPipe) id: string,
    @Body() updateUser: UpdateUserDTO,
  ) {
    return await this.users.update(id, updateUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.SYSTEM_ADMIN)
  @Delete(USERS_ROUTES.ID_PARAM)
  async delete(@Param(ROUTE_PARAMS.ID, ParseUUIDPipe) id: string) {
    return await this.users.delete(id);
  }
}
