// Protected Route - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
