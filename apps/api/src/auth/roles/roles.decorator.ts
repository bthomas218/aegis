import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants';
import type { UserRoles } from 'src/generated/prisma/enums';

export { ROLES_KEY };

export const Roles = (...roles: UserRoles[]) => SetMetadata(ROLES_KEY, roles);
