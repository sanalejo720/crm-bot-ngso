// Financial Dashboard - NGS&O CRM Gestión
// Dashboard de métricas financieras y recaudo
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

dayjs.locale('es');

interface FinancialSummary {
  period: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  globalRecoveryRate: number;
  campaignsStats: CampaignFinancials[];
  topAgents: AgentRecaudo[];
}

interface CampaignFinancials {
  campaignId: string;
  campaignName: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  recoveryPercentage: number;
  paymentsCount: number;
  promisesCount: number;
  clientsWithDebt: number;
  clientsPaid: number;
}

interface AgentRecaudo {
  agentId: string;
  agentName: string;
  totalRecovered: number;
  paymentsCount: number;
  promisesCount: number;
  totalInPromises: number;
  effectivenessRate: number;
  averageTicket: number;
  clientsAttended: number;
  ranking?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, [period]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      let url = `/financial/summary?period=${period}`;
      
      if (period === 'custom') {
        url += `&startDate=${startDate.format('YYYY-MM-DD')}&endDate=${endDate.format('YYYY-MM-DD')}`;
      }

      const response = await api.get(url);
      setFinancialData(response.data.data);
    } catch (error) {
      console.error('Error al cargar datos financieros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (period === 'custom') {
      loadFinancialData();
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <ModernSidebar />
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
          <AppHeader />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <CircularProgress />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              💰 Dashboard Financiero
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadFinancialData}
            >
              Actualizar
            </Button>
          </Box>

          {/* Period Selector */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Período</InputLabel>
                  <Select
                    value={period}
                    label="Período"
                    onChange={(e) => setPeriod(e.target.value as any)}
                  >
                    <MenuItem value="daily">Hoy</MenuItem>
                    <MenuItem value="weekly">Esta Semana</MenuItem>
                    <MenuItem value="monthly">Este Mes</MenuItem>
                    <MenuItem value="custom">Rango Personalizado</MenuItem>
                  </Select>
                </FormControl>

                {period === 'custom' && (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      label="Fecha Inicio"
                      value={startDate}
                      onChange={(newValue) => newValue && setStartDate(newValue)}
                    />
                    <DatePicker
                      label="Fecha Fin"
                      value={endDate}
                      onChange={(newValue) => newValue && setEndDate(newValue)}
                    />
                    <Button variant="contained" onClick={handleApplyCustomRange}>
                      Aplicar
                    </Button>
                  </LocalizationProvider>
                )}

                {financialData && (
                  <Typography variant="body2" color="textSecondary" ml="auto">
                    {financialData.period}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography color="white" variant="subtitle2" gutterBottom>
                  Total a Recuperar
                </Typography>
                <Typography color="white" variant="h4" fontWeight="bold">
                  {formatCurrency(financialData?.totalToRecover || 0)}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography color="white" variant="subtitle2" gutterBottom>
                  Total Recuperado
                </Typography>
                <Typography color="white" variant="h4" fontWeight="bold">
                  {formatCurrency(financialData?.totalRecovered || 0)}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography color="white" variant="subtitle2" gutterBottom>
                  En Promesas de Pago
                </Typography>
                <Typography color="white" variant="h4" fontWeight="bold">
                  {formatCurrency(financialData?.totalInPromises || 0)}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'primary.light' }}>
              <CardContent>
                <Typography color="white" variant="subtitle2" gutterBottom>
                  % Recuperación
                </Typography>
                <Typography color="white" variant="h4" fontWeight="bold">
                  {(financialData?.globalRecoveryRate || 0).toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Charts Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Pie Chart - Campañas */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recuperación por Campaña
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(financialData?.campaignsStats || []) as any}
                      dataKey="totalRecovered"
                      nameKey="campaignName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(financialData?.campaignsStats || []).map((_campaign, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campaign Stats Table */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estadísticas por Campaña
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaña</TableCell>
                        <TableCell align="right">Recuperado</TableCell>
                        <TableCell align="right">%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(financialData?.campaignsStats || []).map((campaign) => (
                        <TableRow key={campaign.campaignId}>
                          <TableCell>{campaign.campaignName}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold" color="success.main">
                              {formatCurrency(campaign.totalRecovered)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${(campaign.recoveryPercentage || 0).toFixed(1)}%`}
                              size="small"
                              color={(campaign.recoveryPercentage || 0) > 50 ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* Agent Ranking */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Top 10 Agentes por Recaudo
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Agente</TableCell>
                      <TableCell align="right">Recuperado</TableCell>
                      <TableCell align="right">Pagos</TableCell>
                      <TableCell align="right">Promesas</TableCell>
                      <TableCell align="right">Ticket Prom.</TableCell>
                      <TableCell align="right">Efectividad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(financialData?.topAgents || []).map((agent, index) => (
                      <TableRow key={agent.agentId}>
                        <TableCell>
                          <Chip
                            label={index + 1}
                            color={index === 0 ? 'warning' : index < 3 ? 'info' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">{agent.agentName}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold" color="success.main">
                            {formatCurrency(agent.totalRecovered)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{agent.paymentsCount}</TableCell>
                        <TableCell align="right">{agent.promisesCount}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(agent.averageTicket)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${(agent.effectivenessRate || 0).toFixed(1)}%`}
                            size="small"
                            color={(agent.effectivenessRate || 0) > 70 ? 'success' : (agent.effectivenessRate || 0) > 50 ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!financialData?.topAgents || financialData.topAgents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="textSecondary">
                            No hay datos de recaudo para este período
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
