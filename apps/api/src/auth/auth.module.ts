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

const EXPIRY_MINUTES = 60;

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          issuer: 'aegis',
          expiresIn: `${EXPIRY_MINUTES}m`,
          audience: 'aegis-api',
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
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
