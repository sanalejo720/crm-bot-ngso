import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  module: string;
  action: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || !user.role.permissions) {
      throw new ForbiddenException('No tiene permisos para realizar esta acción');
    }

    const userPermissions = user.role.permissions;

    const hasPermission = requiredPermissions.some((required) =>
      userPermissions.some(
        (userPerm: any) =>
          userPerm.module === required.module && userPerm.action === required.action,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Requiere permiso: ${requiredPermissions.map((p) => `${p.module}:${p.action}`).join(' o ')}`,
      );
    }

    return true;
  }
}
