// Role-Based Home - NGS&O CRM Gestión
// Muestra la vista correcta según el rol del usuario
// Desarrollado por: Alejandro Sandoval - AS Software

import { useAppSelector } from '../hooks/redux';
import ModernAgentDashboard from './ModernAgentDashboard';
import ModernSupervisorDashboard from './ModernSupervisorDashboard';

const RoleBasedHome = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Si es agente, mostrar dashboard moderno de agente
  if (user?.role?.name === 'Agente') {
    return <ModernAgentDashboard />;
  }

  // Si es supervisor, admin, superadmin, mostrar dashboard moderno de supervisión
  return <ModernSupervisorDashboard />;
};

export default RoleBasedHome;
