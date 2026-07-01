import { IsDate, IsString, IsUUID } from 'class-validator';

export class CreateResetTokenDTO {
  @IsString()
  tokenHash!: string;

  @IsDate()
  expiresAt!: Date;

  @IsUUID()
  userId!: string;
}
