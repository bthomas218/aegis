import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request.type';

@Controller('users')
export class UsersController {
  constructor() {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    const { id, email, createdAt, role } = req.user;
    return { id, email, createdAt, role };
  }
}
