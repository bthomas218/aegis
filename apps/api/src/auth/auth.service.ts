import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { CredentialsDTO } from './dto/credentials-dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';
import { RefreshTokensService } from './refresh-tokens/refresh-tokens.service';
import { JwtPayload } from './types/jwt-payload.type';
import { ResetTokensService } from './reset-tokens/reset-tokens.service';
import { SessionsService } from 'src/sessions/sessions.service';
import { PasswordResetLinkService } from './password-reset-link.service';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages.constants';
import { JWT_CONFIG } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly resetTokens: ResetTokensService,
    private readonly sessions: SessionsService,
    private readonly passwordResetLinks: PasswordResetLinkService,
  ) {}

  async register(
    credentials: CredentialsDTO,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const { email, password } = credentials;
    const password_hash = await argon2.hash(password);

    const user = await this.users.create({ email, password_hash });

    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: await this.refreshTokens.create(
        user.id,
        userAgent,
        ipAddress,
      ),
    };
  }

  async login(user: User, userAgent?: string, ipAddress?: string) {
    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: await this.refreshTokens.create(
        user.id,
        userAgent,
        ipAddress,
      ),
    };
  }

  async validateUser(credentials: CredentialsDTO) {
    const { email, password } = credentials;

    let user: User | null;

    try {
      user = await this.users.findByEmail(email);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return null;
      }

      throw err;
    }

    if (!user || !user.password_hash) {
      return null;
    }

    const valid = await argon2.verify(user.password_hash, password);

    if (!valid) {
      return null;
    }

    return user;
  }

  async refresh(refreshToken: string) {
    const payload = await this.refreshTokens.rotate(refreshToken);

    return {
      accessToken: await this.issueAccessToken(payload.user),
      refreshToken: payload.newToken,
    };
  }

  async logout(refreshToken: string) {
    await this.refreshTokens.logout(refreshToken);
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.users.findByEmail(email);

      if (!user) {
        return;
      }

      const token = await this.resetTokens.create(user.id);

      await this.passwordResetLinks.send(user.email, token);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return;
      }

      throw err;
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.resetTokens.find(token);

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        ERROR_MESSAGES.INVALID_PASSWORD_RESET_TOKEN,
      );
    }

    const password_hash = await argon2.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password_hash,
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });

    await this.sessions.revokeAll(resetToken.userId);
  }

  async issueAccessToken(user: Omit<User, 'password_hash'>) {
    const { id, email, role } = user;
    const payload: JwtPayload = {
      sub: `${JWT_CONFIG.SUBJECT_PREFIX}${id}`,
      email,
      role,
    };

    return await this.jwt.signAsync(payload);
  }
}
