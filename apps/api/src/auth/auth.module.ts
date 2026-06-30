import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { RefreshTokensService } from './refresh-tokens/refresh-tokens.service';

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
  ],
  providers: [AuthService, PrismaService, UsersService, RefreshTokensService],
  controllers: [AuthController],
})
export class AuthModule {}
