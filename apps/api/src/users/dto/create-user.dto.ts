import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRoles } from 'src/generated/prisma/enums';
import { UserCreateInput } from 'src/generated/prisma/models';

export class CreateUserDTO implements UserCreateInput {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  password_hash?: string | null | undefined;

  @IsEnum(UserRoles)
  @IsOptional()
  role?: UserRoles | undefined;
}
