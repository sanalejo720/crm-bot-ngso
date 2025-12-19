import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  People,
  WorkOutline,
  CheckCircle,
  PauseCircle,
  Restaurant,
  Coffee,
  Wc,
  MeetingRoom,
  MoreHoriz,
  Chat,
} from '@mui/icons-material';
import api from '../../services/api';

interface User {
  id: number;
  fullName?: string;
  email: string;
  role: string;
  currentChatsCount?: number;
}

interface PauseBreakdown {
  lunch: number;
  break: number;
  bathroom: number;
  meeting: number;
  other: number;
}

interface AgentWorkday {
  id: string;
  clockInTime: string;
  clockOutTime: string | null;
  totalWorkMinutes: number;
  totalPauseMinutes: number;
  totalProductiveMinutes: number;
  chatsHandled: number;
  currentStatus: 'working' | 'on_pause' | string;
  currentPauseType?: string | null;
  pauseBreakdown?: PauseBreakdown;
}

interface AgentData {
  user: User;
  workday: AgentWorkday | null;
  activeChats: number;
}

const AgentMonitoring: React.FC = () => {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentsData();
    const interval = setInterval(fetchAgentsData, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAgentsData = async () => {
    try {
      setLoading(true);

      // Fetch all users with agent role
      const usersRes = await api.get('/users');
      const users = usersRes.data?.data || usersRes.data || [];
      const agentUsers = users.filter((user: any) => user.role?.name === 'Agente');

      // Fetch workday data for each agent
      const agentsData = await Promise.all(
        agentUsers.map(async (user: User) => {
          try {
            const workdayRes = await api.get(`/workday/agent/${user.id}`);
            const workday = workdayRes.data?.data || workdayRes.data;
            
            return {
              user,
              workday: workday,
              activeChats: user.currentChatsCount || 0
            };
          } catch (error) {
            return {
              user,
              workday: null,
              activeChats: 0
            };
          }
        })
      );

      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) {
      return '00:00:00';
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No disponible';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStateColor = (state: string | null | undefined): 'success' | 'info' | 'warning' | 'default' => {
    if (!state) return 'default';
    switch (state) {
      case 'working': return 'success';
      case 'available': return 'info';
      case 'on_pause': return 'warning';
      default: return 'default';
    }
  };

  const getStateLabel = (state: string | null | undefined): string => {
    if (!state) return 'Sin sesión';
    switch (state) {
      case 'working': return 'Trabajando';
      case 'available': return 'Disponible';
      case 'on_pause': return 'En Pausa';
      default: return 'Sin sesión';
    }
  };

  const getPauseIcon = (type: string | null) => {
    if (!type) return null;
    switch (type) {
      case 'lunch': return <Restaurant fontSize="small" />;
      case 'break': return <Coffee fontSize="small" />;
      case 'bathroom': return <Wc fontSize="small" />;
      case 'meeting': return <MeetingRoom fontSize="small" />;
      default: return <MoreHoriz fontSize="small" />;
    }
  };

  const getPauseLabel = (type: string | null): string => {
    if (!type) return '-';
    switch (type) {
      case 'lunch': return 'Almuerzo';
      case 'break': return 'Descanso';
      case 'bathroom': return 'Baño';
      case 'meeting': return 'Reunión';
      default: return 'Otro';
    }
  };

  // Calculate summary stats
  const totalAgents = agents.length;
  const workingAgents = agents.filter(a => a.workday?.currentStatus === 'working').length;
  const availableAgents = agents.filter(a => a.workday?.currentStatus === 'available').length;
  const onPauseAgents = agents.filter(a => a.workday?.currentStatus === 'on_pause').length;

  if (loading && agents.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Monitoreo de Agentes
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <People color="primary" />
              <Typography color="text.secondary">
                Total Agentes
              </Typography>
            </Box>
            <Typography variant="h4">
              {totalAgents}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WorkOutline color="success" />
              <Typography color="text.secondary">
                Trabajando
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {workingAgents}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle color="info" />
              <Typography color="text.secondary">
                Disponibles
              </Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {availableAgents}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PauseCircle color="warning" />
              <Typography color="text.secondary">
                En Pausa
              </Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {onPauseAgents}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Agents Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Estado de Agentes
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Agente</strong></TableCell>
                  <TableCell><strong>Estado</strong></TableCell>
                  <TableCell><strong>Entrada</strong></TableCell>
                  <TableCell><strong>Tiempo Total</strong></TableCell>
                  <TableCell><strong>Tiempo Productivo</strong></TableCell>
                  <TableCell><strong>Tiempo en Pausa</strong></TableCell>
                  <TableCell><strong>Tipo de Pausa</strong></TableCell>
                  <TableCell><strong>Chats Activos</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {agent.user.fullName || agent.user.email.split('@')[0]}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {agent.workday ? (
                        <Chip 
                          label={getStateLabel(agent.workday.currentStatus)}
                          color={getStateColor(agent.workday.currentStatus)}
                          size="small"
                        />
                      ) : (
                        <Chip label="Fuera de línea" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.workday?.clockInTime ? formatDateTime(agent.workday.clockInTime) : 'No disponible'}
                    </TableCell>
                    <TableCell>
                      {agent.workday?.totalWorkMinutes != null ? formatTime(agent.workday.totalWorkMinutes) : '00:00:00'}
                    </TableCell>
                    <TableCell>
                      <Typography color="success.main">
                        {agent.workday?.totalProductiveMinutes != null ? formatTime(agent.workday.totalProductiveMinutes) : '00:00:00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="warning.main">
                        {agent.workday?.totalPauseMinutes != null ? formatTime(agent.workday.totalPauseMinutes) : '00:00:00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {agent.workday?.currentPauseType ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getPauseIcon(agent.workday.currentPauseType)}
                          <Typography variant="body2">
                            {getPauseLabel(agent.workday.currentPauseType)}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chat fontSize="small" color="info" />
                        <Typography variant="body2">
                          {agent.activeChats}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {agents.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No hay agentes disponibles
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Actualización automática cada 30 segundos
      </Typography>
    </Box>
  );
};

export default AgentMonitoring;
