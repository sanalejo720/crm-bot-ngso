// Supervisor Dashboard - NGS&O CRM Gestión
// Dashboard completo para supervisores y administradores
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  People,
  Chat,
  AttachMoney,
  HourglassEmpty,
  Visibility,
} from '@mui/icons-material';
import AppHeader from '../components/layout/AppHeader';
import apiService from '../services/api';
import AgentMonitoring from '../components/workday/AgentMonitoring';

interface DashboardStats {
  totalAgents: number;
  availableAgents: number;
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  resolvedChats: number;
  totalDebt: number;
  averageDebt: number;
}

interface AgentStats {
  id: string;
  fullName: string;
  email: string;
  agentState: string;
  currentChatsCount: number;
  maxConcurrentChats: number;
}

interface RecentChat {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  assignedAgent: {
    fullName: string;
  } | null;
  lastMessageAt: string;
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    availableAgents: 0,
    totalChats: 0,
    activeChats: 0,
    waitingChats: 0,
    resolvedChats: 0,
    totalDebt: 0,
    averageDebt: 0,
  });
  
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const agentsResponse = await apiService.get('/users', {
        params: { isAgent: true }
      });
      const agentsData = agentsResponse.data.data || [];
      setAgents(agentsData);

      const chatsResponse = await apiService.get('/chats');
      const chatsData = chatsResponse.data.data || [];

      setRecentChats(chatsData.slice(0, 10));

      const activeChats = chatsData.filter((c: any) => c.status === 'active').length;
      const waitingChats = chatsData.filter((c: any) => c.status === 'waiting').length;
      const resolvedChats = chatsData.filter((c: any) => c.status === 'resolved').length;
      const availableAgents = agentsData.filter((a: any) => a.agentState === 'available').length;

      const chatsWithDebt = chatsData.filter((c: any) => c.client?.debtAmount > 0);
      const totalDebt = chatsWithDebt.reduce((sum: number, c: any) => sum + (c.client?.debtAmount || 0), 0);
      const averageDebt = chatsWithDebt.length > 0 ? totalDebt / chatsWithDebt.length : 0;

      setStats({
        totalAgents: agentsData.length,
        availableAgents,
        totalChats: chatsData.length,
        activeChats,
        waitingChats,
        resolvedChats,
        totalDebt,
        averageDebt,
      });

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentStateColor = (state: string) => {
    switch (state) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'in-break': return 'info';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  const getAgentStateLabel = (state: string) => {
    switch (state) {
      case 'available': return 'Disponible';
      case 'busy': return 'Ocupado';
      case 'in-break': return 'En descanso';
      case 'offline': return 'Desconectado';
      default: return state;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'success';
      case 'resolved': return 'info';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const formatRelativeDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
  };
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <AppHeader />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Dashboard de Supervisión
        </Typography>
        
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="Vista General" />
          <Tab label="Monitoreo de Agentes" />
        </Tabs>
        
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {tabValue === 1 && <AgentMonitoring />}

        {tabValue === 0 && (
          <Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3 
        }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Agentes Totales
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {stats.totalAgents}
                  </Typography>
                  <Chip 
                    label={`${stats.availableAgents} disponibles`}
                    size="small"
                    color="success"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <People fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Chats Totales
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {stats.totalChats}
                  </Typography>
                  <Chip 
                    label={`${stats.activeChats} activos`}
                    size="small"
                    color="success"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <Chat fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    En Cola
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    {stats.waitingChats}
                  </Typography>
                  <Chip 
                    label="Esperando asignación"
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <HourglassEmpty fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Deuda Total
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error">
                    ${stats.totalDebt.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Promedio: ${Math.round(stats.averageDebt).toLocaleString('es-CO')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <AttachMoney fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2 
        }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Estado de Agentes
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Agente</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Chats</TableCell>
                    <TableCell align="center">Capacidad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {agent.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {agent.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getAgentStateLabel(agent.agentState)}
                          size="small"
                          color={getAgentStateColor(agent.agentState)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {agent.currentChatsCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={(agent.currentChatsCount / agent.maxConcurrentChats) * 100}
                            color={agent.currentChatsCount >= agent.maxConcurrentChats ? 'error' : 'success'}
                            sx={{ mb: 0.5 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {agent.currentChatsCount}/{agent.maxConcurrentChats}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {agents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay agentes registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Chats Recientes
              </Typography>
              <Tooltip title="Ver todos los chats">
                <IconButton 
                  size="small"
                  onClick={() => navigate('/all-chats')}
                  color="primary"
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Agente</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="right">Actividad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentChats.map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {chat.contactName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {chat.contactPhone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {chat.assignedAgent?.fullName || 'Sin asignar'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={chat.status}
                          size="small"
                          color={getStatusColor(chat.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeDate(chat.lastMessageAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentChats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay chats recientes
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        </Box>
        )}
      </Box>
    </Box>
  );
}
