// NGS&O CRM Gestión - App Router
// Desarrollado por: Alejandro Sandoval - AS Software

import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleGuard from './components/auth/RoleGuard'
import RoleBasedHome from './pages/RoleBasedHome'
import AgentWorkspace from './pages/AgentWorkspace'
import SupervisorDashboard from './pages/SupervisorDashboard'
import AgentDashboard from './pages/AgentDashboard'
import AllChatsView from './pages/AllChatsView'
import UsersManagement from './pages/UsersManagement'
import DebugPage from './pages/DebugPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        {/* Ruta principal - muestra vista según rol */}
        <Route path="/" element={<RoleBasedHome />} />
        
        {/* Debug accesible para todos */}
        <Route path="/debug" element={<DebugPage />} />
        
        {/* Rutas solo para Agentes */}
        <Route element={<RoleGuard allowedRoles={['Agente']} />}>
          <Route path="/workspace" element={<AgentWorkspace />} />
          <Route path="/my-dashboard" element={<AgentDashboard />} />
        </Route>
        
        {/* Rutas solo para Supervisores y Administradores */}
        <Route element={<RoleGuard allowedRoles={['Supervisor', 'Administrador', 'Super Admin']} />}>
          <Route path="/all-chats" element={<AllChatsView />} />
          <Route path="/dashboard" element={<SupervisorDashboard />} />
          <Route path="/users" element={<UsersManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
