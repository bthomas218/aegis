import { IsString, IsNotEmpty } from 'class-validator';
import { VALIDATION_MESSAGES } from '../auth.constants';

export class RefreshDTO {
  @IsString({ message: VALIDATION_MESSAGES.REFRESH_TOKEN_MUST_BE_STRING })
  @IsNotEmpty({ message: VALIDATION_MESSAGES.MISSING_REFRESH_TOKEN })
  refreshToken!: string;
}
