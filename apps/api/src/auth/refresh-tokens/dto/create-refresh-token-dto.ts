import { IsDate, IsString, IsUUID } from 'class-validator';
export class CreateRefreshTokenDTO {
  @IsString()
  tokenHash!: string;

  @IsDate()
  expiresAt!: Date;

  @IsUUID()
  familyId!: string;
}
