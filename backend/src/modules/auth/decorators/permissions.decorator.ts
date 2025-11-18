import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, PermissionRequirement } from '../guards/permissions.guard';

export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
