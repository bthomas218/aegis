import { User } from 'src/generated/prisma/client';

export type LoginRequest = Request & {
  user: User;
};
