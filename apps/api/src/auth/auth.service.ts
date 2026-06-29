import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { CredentialsDTO } from './dto/credentials-dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(credentials: CredentialsDTO) {
    const { email, password } = credentials;
    const password_hash = await argon2.hash(password);

    const user = await this.users.create({ email, password_hash });

    return { acess_token: await this.issueAcessToken(user) };
  }

  async login(credentials: CredentialsDTO) {
    const { email, password } = credentials;

    const user = await this.users.findByEmail(email);

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await argon2.verify(user.password_hash, password);

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { acess_token: await this.issueAcessToken(user) };
  }

  async issueAcessToken(user: User) {
    const { id, email } = user;
    const payload = {
      sub: `aegis_${id}`,
      email,
    };

    return await this.jwt.signAsync(payload);
  }
}
