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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Send,
  People,
  Chat as ChatIcon,
  Phone,
  AccessTime,
} from '@mui/icons-material';
import apiService from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface AgentStats {
  agentEmail: string;
  agentName: string;
  total: number;
  assigned: number;
  pending: number;
  assignmentRate: string;
}

interface Campaign {
  name: string;
  total: number;
  createdAt: string;
}

interface MassCampaignChat {
  id: string;
  contactPhone: string;
  contactName: string;
  status: string;
  lastMessageAt: string;
  metadata: {
    hasClientResponse?: boolean;
    campaignName?: string;
    sentAt?: string;
    agentEmail?: string;
  };
}

interface CampaignStats {
  total: number;
  assigned: number;
  pending: number;
  assignmentRate: string;
  byAgent: AgentStats[];
  campaigns: Campaign[];
}

const MassCampaignStats: React.FC = () => {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [chats, setChats] = useState<MassCampaignChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalChats, setTotalChats] = useState(0);
  const chatsPerPage = 20;

  const loadStats = async (campaignName?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = campaignName 
        ? `/campaigns/mass/stats?campaignName=${encodeURIComponent(campaignName)}`
        : '/campaigns/mass/stats';
      const response = await apiService.get(url);
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
    loadStats(selectedCampaign || undefined);
    loadChats(selectedCampaign || undefined, currentPage);
  }, [selectedCampaign, currentPage]);

  const loadChats = async (campaignName?: string, page: number = 1) => {
    try {
      setChatsLoading(true);
      const params: any = {
        page,
        limit: chatsPerPage,
      };
      
      // Filtrar por campaña si se proporciona
      if (campaignName) {
        params.campaignName = campaignName;
      }
      
      const response = await apiService.get('/chats/mass-campaigns', { params });
      const actualData = response.data.data || response.data;
      
      // Si la respuesta tiene paginación
      if (actualData.data && actualData.pagination) {
        setChats(actualData.data || []);
        setTotalChats(actualData.pagination.total || 0);
      } else if (Array.isArray(actualData)) {
        setChats(actualData);
        setTotalChats(actualData.length);
      } else if (actualData.data && Array.isArray(actualData.data)) {
        setChats(actualData.data);
        setTotalChats(actualData.data.length);
      } else {
        setChats([]);
        setTotalChats(0);
      }
    } catch (err: any) {
      console.error('Error loading chats:', err);
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  };

  const handleCampaignChange = (event: SelectChangeEvent<string>) => {
    setSelectedCampaign(event.target.value);
    setCurrentPage(1); // Reset a primera página
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return date.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

          {/* Filtro de Campañas */}
          <Box mb={3}>
            <FormControl fullWidth>
              <InputLabel id="campaign-filter-label">Filtrar por Campaña</InputLabel>
              <Select
                labelId="campaign-filter-label"
                id="campaign-filter"
                value={selectedCampaign}
                label="Filtrar por Campaña"
                onChange={handleCampaignChange}
              >
                <MenuItem value="">
                  <em>Todas las Campañas</em>
                </MenuItem>
                {stats?.campaigns?.map((campaign) => (
                  <MenuItem key={campaign.name} value={campaign.name}>
                    {campaign.name} ({campaign.total} mensajes - {new Date(campaign.createdAt).toLocaleDateString()})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

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
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {agent.agentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.agentEmail}
                        </Typography>
                      </Box>
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

      {/* Tabla de chats enviados */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <ChatIcon color="primary" />
              <Typography variant="h6">
                Chats Enviados
              </Typography>
              <Chip 
                label={totalChats.toLocaleString()} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            {selectedCampaign && (
              <Chip 
                label={`Campaña: ${selectedCampaign}`} 
                size="small" 
                color="info"
                onDelete={() => setSelectedCampaign('')}
              />
            )}
          </Box>

          {chatsLoading ? (
            <Box py={4} textAlign="center">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell align="center">Estado</TableCell>
                      <TableCell>Agente</TableCell>
                      <TableCell align="right">Enviado</TableCell>
                      <TableCell align="right">Última Actividad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chats.map((chat) => (
                      <TableRow 
                        key={chat.id}
                        sx={{ 
                          '&:hover': { backgroundColor: 'action.hover' },
                          opacity: chat.metadata?.hasClientResponse ? 1 : 0.7
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {chat.contactName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">
                              {chat.contactPhone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {chat.metadata?.hasClientResponse ? (
                            <Chip 
                              label="Respondió" 
                              size="small" 
                              color="success"
                              icon={<CheckCircle />}
                            />
                          ) : (
                            <Chip 
                              label="Sin respuesta" 
                              size="small" 
                              color="default"
                              icon={<Schedule />}
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {chat.metadata?.agentEmail || 'Sin asignar'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={0.5} justifyContent="flex-end">
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {chat.metadata?.sentAt ? formatDate(chat.metadata.sentAt) : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">
                            {chat.lastMessageAt ? formatDate(chat.lastMessageAt) : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {chats.length === 0 && !chatsLoading && (
                <Box py={4} textAlign="center">
                  <Typography color="text.secondary">
                    No hay chats enviados para esta campaña
                  </Typography>
                </Box>
              )}

              {totalChats > chatsPerPage && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Box display="flex" gap={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Página {currentPage} de {Math.ceil(totalChats / chatsPerPage)} 
                      ({totalChats} total)
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label="Anterior"
                        size="small"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        clickable
                      />
                      <Chip
                        label="Siguiente"
                        size="small"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalChats / chatsPerPage), p + 1))}
                        disabled={currentPage >= Math.ceil(totalChats / chatsPerPage)}
                        clickable
                      />
                    </Box>
                  </Box>
                </Box>
              )}
            </>
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
