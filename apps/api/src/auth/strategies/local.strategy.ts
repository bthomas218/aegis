import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import { AUTH_CREDENTIAL_FIELDS } from '../auth.constants';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: AUTH_CREDENTIAL_FIELDS.EMAIL,
      passwordField: AUTH_CREDENTIAL_FIELDS.PASSWORD,
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser({ email, password });
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    return user;
  }
}
