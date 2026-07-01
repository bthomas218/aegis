import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type';
import { UsersService } from 'src/users/users.service';
import { ENV_KEYS } from 'src/common/constants/env.constants';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import { JWT_CONFIG } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>(ENV_KEYS.JWT_SECRET),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub.startsWith(JWT_CONFIG.SUBJECT_PREFIX)) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN_SUBJECT);
    }

    const id = payload.sub.replace(JWT_CONFIG.SUBJECT_PREFIX, '');

    try {
      const user = await this.users.findById(id);

      return user;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN_SUBJECT);
      }

      throw err;
    }
  }
}
