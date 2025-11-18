// Role-Based Route Guard - NGS&O CRM Gestión
// Componente para proteger rutas según el rol del usuario
// Desarrollado por: Alejandro Sandoval - AS Software

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

interface RoleGuardProps {
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleGuard({ allowedRoles, redirectTo = '/' }: RoleGuardProps) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.name;
  const hasAllowedRole = allowedRoles.some(role => 
    role.toLowerCase() === userRole?.toLowerCase()
  );

  if (!hasAllowedRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
