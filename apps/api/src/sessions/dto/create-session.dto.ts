import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateRefreshTokenDTO } from 'src/auth/refresh-tokens/dto/create-refresh-token-dto';

export class CreateSessionDTO {
  @IsUUID()
  userId!: string;

  @IsDate()
  expiresAt!: Date;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ValidateNested()
  @Type(() => CreateRefreshTokenDTO)
  refreshToken!: CreateRefreshTokenDTO;
}
