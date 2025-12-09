import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

interface RequestUser {
  role?: string;
}

interface RequestWithUser {
  user?: RequestUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<Array<'user' | 'admin'>>(
        ROLES_KEY,
        context.getHandler(),
      ) ||
      this.reflector.get<Array<'user' | 'admin'>>(
        ROLES_KEY,
        context.getClass(),
      );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const userRole = user.role as 'user' | 'admin';

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
