import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialsDTO } from './dto/credentials-dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() credentials: CredentialsDTO) {
    return await this.auth.register(credentials);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() credentials: CredentialsDTO) {
    return await this.auth.login(credentials);
  }
}
