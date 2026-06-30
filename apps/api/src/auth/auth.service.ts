import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { CredentialsDTO } from './dto/credentials-dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';
import { RefreshTokensService } from './refresh-tokens/refresh-tokens.service';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  async register(credentials: CredentialsDTO) {
    const { email, password } = credentials;
    const password_hash = await argon2.hash(password);

    const user = await this.users.create({ email, password_hash });

    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: await this.refreshTokens.create(user.id),
    };
  }

  async login(user: User) {
    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: await this.refreshTokens.create(user.id),
    };
  }

  async validateUser(credentials: CredentialsDTO) {
    const { email, password } = credentials;

    const user = await this.users.findByEmail(email);

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
    await this.refreshTokens.revoke(refreshToken);
  }

  async issueAccessToken(user: User) {
    const { id, email, role } = user;
    const payload: JwtPayload = {
      sub: `aegis|${id}`,
      email,
      role,
    };

    return await this.jwt.signAsync(payload);
  }
}
