import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LIST_USERS_DEFAULTS } from 'src/common/constants/pagination.constants';
import { UserRoles } from 'src/generated/prisma/enums';

export class ListUsersDTO {
  @Type(() => Number)
  @IsInt()
  @Min(LIST_USERS_DEFAULTS.MIN_LIMIT)
  @IsOptional()
  page = LIST_USERS_DEFAULTS.PAGE;

  @Type(() => Number)
  @IsInt()
  @Min(LIST_USERS_DEFAULTS.MIN_LIMIT)
  @Max(LIST_USERS_DEFAULTS.MAX_LIMIT)
  @IsOptional()
  limit = LIST_USERS_DEFAULTS.LIMIT;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UserRoles)
  @IsOptional()
  role?: UserRoles;
}
