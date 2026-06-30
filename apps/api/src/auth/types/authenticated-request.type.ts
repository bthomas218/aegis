import { User } from 'src/generated/prisma/client';

export type AuthenticatedRequest = Request & {
  user: User;
};
