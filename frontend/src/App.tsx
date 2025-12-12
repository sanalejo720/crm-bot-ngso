// NGS&O CRM Gestión - App Router
// Desarrollado por: Alejandro Sandoval - AS Software

import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleGuard from './components/auth/RoleGuard'
import RoleBasedHome from './pages/RoleBasedHome'
import AgentWorkspace from './pages/AgentWorkspace'
import ModernSupervisorDashboard from './pages/ModernSupervisorDashboard'
import ModernAgentDashboard from './pages/ModernAgentDashboard'
import AllChatsView from './pages/AllChatsView'
import UsersManagement from './pages/UsersManagement'
import DebugPage from './pages/DebugPage'
import CampaignsPage from './pages/CampaignsPage'
import ReportsPage from './pages/ReportsPage'
import HelpPage from './pages/HelpPage'
import SettingsPage from './pages/SettingsPage'
import WhatsAppManagement from './pages/WhatsAppManagement'
import TemplatesManagement from './pages/TemplatesManagement'
import SessionMonitoring from './pages/SessionMonitoring'
import RoleManagement from './pages/RoleManagement'
import FinancialDashboard from './pages/FinancialDashboard'
import BotFlowsPage from './pages/BotFlowsPage'
import BotFlowDetailPage from './pages/BotFlowDetailPage'
import BotFlowEditorPage from './pages/BotFlowEditorPage'
import PaymentEvidencesPage from './pages/PaymentEvidencesPage'
import BackupsPage from './pages/BackupsPage'
import UnidentifiedClientsPage from './pages/UnidentifiedClientsPage'
import DebtorsPage from './pages/DebtorsPage'
import EvidencesPage from './pages/EvidencesPage'
import PaymentPromisesPage from './pages/PaymentPromisesPage'
import AttendanceReportsPage from './pages/AttendanceReportsPage'

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        {/* Ruta principal - muestra vista según rol */}
        <Route path="/" element={<RoleBasedHome />} />
        
        {/* Debug accesible para todos */}
        <Route path="/debug" element={<DebugPage />} />
        
        {/* Workspace - accesible para Agentes y Supervisores */}
        <Route element={<RoleGuard allowedRoles={['Agente', 'Supervisor', 'Administrador', 'Super Admin']} />}>
          <Route path="/workspace" element={<AgentWorkspace />} />
        </Route>
        
        {/* Rutas solo para Agentes */}
        <Route element={<RoleGuard allowedRoles={['Agente']} />}>
          <Route path="/my-dashboard" element={<ModernAgentDashboard />} />
        </Route>
        
        {/* Rutas solo para Supervisores y Administradores */}
        <Route element={<RoleGuard allowedRoles={['Supervisor', 'Administrador', 'Super Admin']} />}>
          <Route path="/all-chats" element={<AllChatsView />} />
          <Route path="/dashboard" element={<ModernSupervisorDashboard />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/roles" element={<RoleManagement />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/debtors" element={<DebtorsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/financial" element={<FinancialDashboard />} />
          <Route path="/payment-evidences" element={<PaymentEvidencesPage />} />
          <Route path="/evidences" element={<EvidencesPage />} />
          <Route path="/payment-promises" element={<PaymentPromisesPage />} />
          <Route path="/whatsapp" element={<WhatsAppManagement />} />
          <Route path="/monitoring" element={<SessionMonitoring />} />
          <Route path="/bot-flows" element={<BotFlowsPage />} />
          <Route path="/bot-flows/:id" element={<BotFlowDetailPage />} />
          <Route path="/bot-flows/:id/editor" element={<BotFlowEditorPage />} />
          <Route path="/backups" element={<BackupsPage />} />
          <Route path="/unidentified-clients" element={<UnidentifiedClientsPage />} />
          <Route path="/attendance" element={<AttendanceReportsPage />} />
        </Route>

        {/* Rutas accesibles para todos los usuarios autenticados */}
        <Route path="/templates" element={<TemplatesManagement />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
