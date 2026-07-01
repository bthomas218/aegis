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
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() credentials: CredentialsDTO, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return await this.auth.register(credentials, userAgent, ipAddress);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return await this.auth.login(req.user, userAgent, ipAddress);
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

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPassword: ForgotPasswordDTO) {
    await this.auth.forgotPassword(forgotPassword.email);

    return {
      message: 'If an account exists, a password reset link will be sent.',
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() resetPassword: ResetPasswordDTO) {
    await this.auth.resetPassword(
      resetPassword.token,
      resetPassword.newPassword,
    );
  }
}
