import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { RefreshTokensService } from './refresh-tokens/refresh-tokens.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './roles/roles.guard';
import { SessionsModule } from 'src/sessions/sessions.module';
import { ResetTokensService } from './reset-tokens/reset-tokens.service';
import { PasswordResetLinkService } from './password-reset-link.service';
import { ENV_KEYS } from 'src/common/constants/env.constants';
import { JWT_CONFIG } from './auth.constants';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(ENV_KEYS.JWT_SECRET),
        signOptions: {
          issuer: JWT_CONFIG.ISSUER,
          expiresIn: `${JWT_CONFIG.EXPIRES_IN_MINUTES}m`,
          audience: JWT_CONFIG.AUDIENCE,
        },
      }),
      inject: [ConfigService],

      global: true,
    }),
    PassportModule,
    SessionsModule,
  ],
  providers: [
    AuthService,
    PrismaService,
    RefreshTokensService,
    LocalStrategy,
    LocalAuthGuard,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ResetTokensService,
    PasswordResetLinkService,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
