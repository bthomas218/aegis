import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDTO {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Missing refresh token' })
  refreshToken!: string;
}
