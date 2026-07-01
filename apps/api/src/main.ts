import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DEFAULT_PORT, ENV_KEYS } from './common/constants/env.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true,
      whitelist: true,
    }),
  );

  await app.listen(process.env[ENV_KEYS.PORT] ?? DEFAULT_PORT);
}
void bootstrap();
