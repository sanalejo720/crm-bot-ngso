import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Send,
  People,
} from '@mui/icons-material';
import apiService from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface AgentStats {
  agentEmail: string;
  total: number;
  assigned: number;
  pending: number;
  assignmentRate: string;
}

interface CampaignStats {
  total: number;
  assigned: number;
  pending: number;
  assignmentRate: string;
  byAgent: AgentStats[];
}

const MassCampaignStats: React.FC = () => {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/campaigns/mass/stats');
      console.log('Full stats response:', response);
      console.log('Stats data:', response.data);
      
      // El backend usa TransformInterceptor que envuelve en {success, data, timestamp}
      // Entonces response.data = {success: true, data: {...}, timestamp: '...'}
      const actualData = response.data.data || response.data;
      console.log('Actual data:', actualData);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!actualData || typeof actualData.total === 'undefined') {
        console.error('Invalid data structure:', actualData);
        throw new Error('Estructura de datos inválida en la respuesta');
      }
      
      setStats(actualData);
    } catch (err: any) {
      console.error('Error loading campaign stats:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error al cargar estadísticas';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Refrescar cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="info">No hay datos disponibles</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box p={3}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            📊 Estadísticas de Campañas Masivas
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom mb={3}>
            Resumen de mensajes enviados y asignaciones de chats
          </Typography>

          {/* Tarjetas de resumen */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Send color="primary" fontSize="large" />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {(stats.total ?? 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mensajes Enviados
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircle color="success" fontSize="large" />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {(stats.assigned ?? 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chats Asignados
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Schedule color="warning" fontSize="large" />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {(stats.pending ?? 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendientes de Respuesta
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <People color="info" fontSize="large" />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {stats.assignmentRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tasa de Respuesta
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Barra de progreso general */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progreso General de Asignaciones
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flex={1}>
              <LinearProgress
                variant="determinate"
                value={parseFloat(stats.assignmentRate ?? '0')}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" minWidth={60}>
              {stats.assigned ?? 0} / {stats.total ?? 0}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Tabla de estadísticas por agente */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estadísticas por Agente
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agente</TableCell>
                  <TableCell align="right">Total Enviados</TableCell>
                  <TableCell align="right">Asignados</TableCell>
                  <TableCell align="right">Pendientes</TableCell>
                  <TableCell align="right">Tasa de Respuesta</TableCell>
                  <TableCell align="right">Progreso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stats.byAgent ?? []).map((agent) => (
                  <TableRow key={agent.agentEmail}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {agent.agentEmail}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={agent.total ?? 0} size="small" color="default" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={agent.assigned ?? 0} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={agent.pending ?? 0} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          parseFloat(agent.assignmentRate ?? '0') > 50
                            ? 'success.main'
                            : parseFloat(agent.assignmentRate ?? '0') > 25
                            ? 'warning.main'
                            : 'error.main'
                        }
                      >
                        {agent.assignmentRate ?? '0.00'}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right" width={200}>
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(agent.assignmentRate ?? '0')}
                        color={
                          parseFloat(agent.assignmentRate ?? '0') > 50
                            ? 'success'
                            : parseFloat(agent.assignmentRate ?? '0') > 25
                            ? 'warning'
                            : 'error'
                        }
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {(stats.byAgent ?? []).length === 0 && (
            <Box py={4} textAlign="center">
              <Typography color="text.secondary">
                No hay estadísticas por agente disponibles
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Box position="fixed" bottom={16} right={16}>
          <CircularProgress size={24} />
        </Box>
      )}
        </Box>
      </Box>
    </Box>
  );
};

export default MassCampaignStats;
