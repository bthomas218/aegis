import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';
import { RefreshDTO } from './dto/refresh-dto';
import { LocalAuthGuard } from './guards/local-auth.gaurd';
import type { LoginRequest } from './types/login-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() credentials: CredentialsDTO) {
    return await this.auth.register(credentials);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: LoginRequest) {
    return await this.auth.login(req.user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() refresh: RefreshDTO) {
    return await this.auth.refresh(refresh.refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() refresh: RefreshDTO) {
    await this.auth.logout(refresh.refreshToken);
  }
}
