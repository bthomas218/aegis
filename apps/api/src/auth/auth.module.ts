import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          issuer: 'aegis',
          expiresIn: '60m',
          audience: 'aegis-api',
        },
      }),
      inject: [ConfigService],

      global: true,
    }),
  ],
  providers: [AuthService, PrismaService, UsersService],
})
export class AuthModule {}
