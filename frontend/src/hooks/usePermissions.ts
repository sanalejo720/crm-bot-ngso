// Custom Hook for Permissions - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useAppSelector } from './redux';

interface UsePermissionsReturn {
  user: any;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  isAgent: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAppSelector((state) => state.auth);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !user.role || !user.role.permissions) {
      console.log('❌ No user, role or permissions');
      return false;
    }
    
    // Normalizar el nombre del recurso: convertir guiones a guiones bajos
    const normalizedResource = resource.replace(/-/g, '_');
    
    // Buscar permiso en múltiples formatos
    const permissionVariants = [
      `${normalizedResource}:${action}`,      // unidentified_clients:read
      `${resource}:${action}`,                // unidentified-clients:read
      `${normalizedResource}_${action}`,      // unidentified_clients_read
      `${resource}_${action}`,                // unidentified-clients_read
      `${normalizedResource}:*`,              // unidentified_clients:*
      `${resource}:*`,                        // unidentified-clients:*
      '*'                                     // super admin wildcard
    ];
    
    const hasAccess = user.role.permissions.some((p: any) => 
      permissionVariants.includes(p.name)
    );
    
    if (!hasAccess) {
      console.log('❌ Permission denied:', {
        looking_for: permissionVariants,
        user_permissions: user.role.permissions.map((p: any) => p.name),
        role: user.role.name
      });
    }
    
    return hasAccess;
  };

  const hasRole = (roleName: string): boolean => {
    return user?.role?.name === roleName;
  };

  const isAgent = user?.isAgent || false;

  return {
    user,
    hasPermission,
    hasRole,
    isAgent,
  };
};

export default usePermissions;
