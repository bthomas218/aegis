import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRoles } from 'src/generated/prisma/enums';
import { UserUpdateInput } from 'src/generated/prisma/models';

export class UpdateUserDTO implements UserUpdateInput {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password_hash?: string | null | undefined;

  @IsEnum(UserRoles)
  @IsOptional()
  role?: UserRoles | undefined;
}
