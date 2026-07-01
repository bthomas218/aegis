import { User } from 'src/generated/prisma/client';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user: User;
};
