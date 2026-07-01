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
import { HTTP_HEADERS } from 'src/common/constants/http.constants';
import { AUTH_ROUTES, RESPONSE_MESSAGES } from './auth.constants';

@Controller(AUTH_ROUTES.ROOT)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post(AUTH_ROUTES.REGISTER)
  async register(@Body() credentials: CredentialsDTO, @Req() req: Request) {
    const userAgent = req.headers[HTTP_HEADERS.USER_AGENT];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return await this.auth.register(credentials, userAgent, ipAddress);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.LOGIN)
  async login(@Req() req: AuthenticatedRequest) {
    const userAgent = req.headers[HTTP_HEADERS.USER_AGENT];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return await this.auth.login(req.user, userAgent, ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.REFRESH)
  async refresh(@Body() refresh: RefreshDTO) {
    return await this.auth.refresh(refresh.refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(AUTH_ROUTES.LOGOUT)
  async logout(@Body() refresh: RefreshDTO) {
    await this.auth.logout(refresh.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.FORGOT_PASSWORD)
  async forgotPassword(@Body() forgotPassword: ForgotPasswordDTO) {
    await this.auth.forgotPassword(forgotPassword.email);

    return {
      message: RESPONSE_MESSAGES.FORGOT_PASSWORD,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(AUTH_ROUTES.RESET_PASSWORD)
  async resetPassword(@Body() resetPassword: ResetPasswordDTO) {
    await this.auth.resetPassword(
      resetPassword.token,
      resetPassword.newPassword,
    );
  }
}
