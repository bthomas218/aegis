import { IsEmail, IsString, MinLength } from 'class-validator';
import { AUTH_VALIDATION, VALIDATION_MESSAGES } from '../auth.constants';

export class CredentialsDTO {
  @IsEmail()
  email!: string;

  @IsString({ message: VALIDATION_MESSAGES.PASSWORD_MUST_BE_STRING })
  @MinLength(AUTH_VALIDATION.PASSWORD_MIN_LENGTH, {
    message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH,
  })
  password!: string;
}
