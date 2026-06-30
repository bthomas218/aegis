import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRoles } from 'src/generated/prisma/enums';

export class ListUsersDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UserRoles)
  @IsOptional()
  role?: UserRoles;
}
