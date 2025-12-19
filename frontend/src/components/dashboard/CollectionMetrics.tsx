// Collection Metrics Dashboard - NGS&O CRM Gestión
// Panel de métricas de cobranza para supervisores
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  AttachMoney,
  TrendingUp,
  People,
  Schedule,
  Cancel,
  CheckCircle,
  PhoneCallback,
} from '@mui/icons-material';
import apiService from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import type { Campaign } from '../../types/index';

interface ResolutionStats {
  total: number;
  byType: {
    paid: number;
    promise: number;
    no_agreement: number;
    callback: number;
  };
  rates: {
    paid: string | number;
    promise: string | number;
    no_agreement: string | number;
    callback: string | number;
  };
}

interface CollectionMetrics {
  totalCollected: number;
  totalDebtAssigned: number;
  recoveryPercentage: number;
  averagePayment: number;
  paymentsCount: number;
}

interface AgentCollectionMetric {
  agentId: string;
  agentName: string;
  totalCollected: number;
  totalAssigned: number;
  recoveryPercentage: number;
  paymentsCount: number;
  ranking: number;
}

interface PortfolioSummary {
  totalPortfolio: number;
  totalCollected: number;
  totalPending: number;
  recoveryPercentage: number;
  clientsCount: number;
  paidClients: number;
  pendingClients: number;
}

export default function CollectionMetrics() {
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [resolutionStats, setResolutionStats] = useState<ResolutionStats | null>(null);
  const [collectionMetrics, setCollectionMetrics] = useState<CollectionMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentCollectionMetric[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadMetrics();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      const response = await apiService.get('/campaigns');
      setCampaigns(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando campañas:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      
      const campaignParam = selectedCampaign !== 'all' ? `?campaignId=${selectedCampaign}` : '';
      
      try {
        const resolutionResponse = await apiService.get(`/chats/resolution-stats/global${campaignParam}`);
        setResolutionStats(resolutionResponse.data.data);
      } catch (e) { console.log('Error stats resolución'); }
      
      try {
        const collectionResponse = await apiService.get(`/metrics/collection${campaignParam}`);
        setCollectionMetrics(collectionResponse.data.data);
      } catch (e) { console.log('Error métricas cobranza'); }
      
      try {
        const agentsResponse = await apiService.get(`/metrics/collection/agents${campaignParam}`);
        setAgentMetrics(agentsResponse.data.data || []);
      } catch (e) { console.log('Error métricas agentes'); }
      
      try {
        const portfolioResponse = await apiService.get(`/metrics/portfolio${campaignParam}`);
        setPortfolioSummary(portfolioResponse.data.data);
      } catch (e) { console.log('Error portafolio'); }
      
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">📊 Métricas de Cobranza</Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Campaña</InputLabel>
          <Select value={selectedCampaign} label="Campaña" onChange={(e) => setSelectedCampaign(e.target.value)}>
            <MenuItem value="all">Todas las campañas</MenuItem>
            {campaigns.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AttachMoney color="success" />
                <Typography variant="subtitle2" color="text.secondary">Total Recuperado</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {formatCurrency(collectionMetrics?.totalCollected || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {collectionMetrics?.paymentsCount || 0} pagos
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="info" />
                <Typography variant="subtitle2" color="text.secondary">Tasa Recuperación</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {(collectionMetrics?.recoveryPercentage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress variant="determinate" value={collectionMetrics?.recoveryPercentage || 0} color="info"
                sx={{ mt: 1, height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="warning" />
                <Typography variant="subtitle2" color="text.secondary">Gestiones Resueltas</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{resolutionStats?.total || 0}</Typography>
              <Typography variant="caption" color="text.secondary">{resolutionStats?.rates.paid || 0}% pagados</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <People color="action" />
                <Typography variant="subtitle2" color="text.secondary">Cartera Total</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">{formatCurrency(portfolioSummary?.totalPending || 0)}</Typography>
              <Typography variant="caption" color="text.secondary">{portfolioSummary?.clientsCount || 0} clientes</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Resultados de Gestión</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="subtitle2">Pagados</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="success.main">{resolutionStats?.byType.paid || 0}</Typography>
                <Typography variant="caption">{resolutionStats?.rates.paid || 0}%</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="warning" fontSize="small" />
                  <Typography variant="subtitle2">Promesas</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{resolutionStats?.byType.promise || 0}</Typography>
                <Typography variant="caption">{resolutionStats?.rates.promise || 0}%</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Cancel color="error" fontSize="small" />
                  <Typography variant="subtitle2">Sin Acuerdo</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="error.main">{resolutionStats?.byType.no_agreement || 0}</Typography>
                <Typography variant="caption">{resolutionStats?.rates.no_agreement || 0}%</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneCallback color="info" fontSize="small" />
                  <Typography variant="subtitle2">Callback</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="info.main">{resolutionStats?.byType.callback || 0}</Typography>
                <Typography variant="caption">{resolutionStats?.rates.callback || 0}%</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Resumen de Cartera</Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Valor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Cartera Total</TableCell>
                    <TableCell align="right">{formatCurrency(portfolioSummary?.totalPortfolio || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="Recuperado" color="success" size="small" /></TableCell>
                    <TableCell align="right">{formatCurrency(portfolioSummary?.totalCollected || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="Pendiente" color="warning" size="small" /></TableCell>
                    <TableCell align="right">{formatCurrency(portfolioSummary?.totalPending || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Clientes Pagados</TableCell>
                    <TableCell align="right">{portfolioSummary?.paidClients || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Clientes Pendientes</TableCell>
                    <TableCell align="right">{portfolioSummary?.pendingClients || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>% Recuperación</strong></TableCell>
                    <TableCell align="right"><strong>{(portfolioSummary?.recoveryPercentage || 0).toFixed(1)}%</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Rendimiento por Agente</Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Agente</TableCell>
                <TableCell align="right">Total Recuperado</TableCell>
                <TableCell align="right">Cartera Asignada</TableCell>
                <TableCell align="right">Pagos</TableCell>
                <TableCell align="right">Tasa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agentMetrics.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No hay datos de agentes</TableCell></TableRow>
              ) : agentMetrics.map((agent) => (
                <TableRow key={agent.agentId}>
                  <TableCell><Chip label={agent.ranking} color="primary" size="small" /></TableCell>
                  <TableCell><Typography fontWeight="medium">{agent.agentName || 'Sin nombre'}</Typography></TableCell>
                  <TableCell align="right"><Typography fontWeight="bold" color="success.main">{formatCurrency(agent.totalCollected)}</Typography></TableCell>
                  <TableCell align="right">{formatCurrency(agent.totalAssigned)}</TableCell>
                  <TableCell align="right">{agent.paymentsCount}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <LinearProgress variant="determinate" value={agent.recoveryPercentage} sx={{ width: 60, height: 8, borderRadius: 4 }} />
                      <Typography variant="body2">{(agent.recoveryPercentage || 0).toFixed(1)}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
