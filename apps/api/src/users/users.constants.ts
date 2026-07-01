import type { UserSelect } from 'src/generated/prisma/models';

export const USERS_ROUTES = {
  ROOT: 'users',
  ADMIN_ROOT: 'admin/users',
  ID_PARAM: ':id',
  ME: 'me',
} as const;

export const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies UserSelect;
