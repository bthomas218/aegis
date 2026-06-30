import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from 'src/generated/prisma/client';
import { UserRoles } from 'src/generated/prisma/enums';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = () => undefined;
  class Controller {}

  const user = {
    role: UserRoles.ADMIN,
  } as User;
  let reflector: Reflector;
  let getAllAndOverride: jest.SpiedFunction<Reflector['getAllAndOverride']>;
  let guard: RolesGuard;

  const createContext = (
    req: Partial<AuthenticatedRequest> = { user },
  ): ExecutionContext =>
    ({
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(Controller),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    getAllAndOverride = jest.spyOn(reflector, 'getAllAndOverride');
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows requests when no roles are required', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      Controller,
    ]);
  });

  it('allows requests when the user has a required role', () => {
    getAllAndOverride.mockReturnValue([UserRoles.USER, UserRoles.ADMIN]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('denies requests when the user does not have a required role', () => {
    getAllAndOverride.mockReturnValue([UserRoles.SYSTEM_ADMIN]);

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('denies requests with required roles when there is no user', () => {
    getAllAndOverride.mockReturnValue([UserRoles.ADMIN]);

    expect(guard.canActivate(createContext({}))).toBe(false);
  });
});
