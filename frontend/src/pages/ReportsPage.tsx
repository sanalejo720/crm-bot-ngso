// Reports Page - NGS&O CRM Gestión
// Reportes y estadísticas con datos reales del backend

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#fa709a'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface SystemStats {
  totalAgents: number;
  activeAgents: number;
  totalChats: number;
  activeChats: number;
  totalDebt: number;
  recoveredToday: number;
  pendingTasks: number;
}

interface SystemMetrics {
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  botChats: number;
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  offlineAgents: number;
  totalMessages24h: number;
  averageResponseTime: number;
  queueSize: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  email: string;
  currentChats: number;
  maxChats: number;
  messagesSent: number;
  promisesObtained: number;
  averageResponseTime: number;
  status: string;
}

interface TrendPoint {
  date: string;
  count: number;
}

const statusLabels: Record<string, string> = {
  waiting: 'En espera',
  pending: 'Pendientes',
  bot: 'Bot',
  active: 'Activos',
  resolved: 'Resueltos',
  closed: 'Cerrados',
};

const formatDuration = (seconds?: number) => {
  if (!seconds && seconds !== 0) return 'N/D';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
};

const getDateRange = (filter: string) => {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (filter) {
    case 'week':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth());
      startDate.setDate(1);
      break;
    case 'year':
      startDate.setMonth(0, 1);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
};

export default function ReportsPage() {
  const [sidebarOpen] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dateFilter, setDateFilter] = useState('today');

  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [agentsPerformance, setAgentsPerformance] = useState<AgentPerformance[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [distributionData, setDistributionData] = useState<Array<{ name: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [dateFilter]);

  const loadReports = async () => {
    const { startDate, endDate } = getDateRange(dateFilter);
    setIsLoading(true);
    setError(null);

    try {
      const [
        statsResponse,
        metricsResponse,
        agentsResponse,
        distributionResponse,
        trendsResponse,
      ] = await Promise.all([
        api.get('/reports/system/stats'),
        api.get('/reports/system'),
        api.get('/reports/agents/performance'),
        api.get('/reports/distribution/chats'),
        api.get('/reports/trends/chats', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }),
      ]);

      setSystemStats(statsResponse.data?.data ?? statsResponse.data);
      setSystemMetrics(metricsResponse.data?.data ?? metricsResponse.data);
      setAgentsPerformance(agentsResponse.data?.data ?? agentsResponse.data ?? []);

      const distribution = distributionResponse.data?.data ?? distributionResponse.data ?? {};
      const distributionChart = Object.entries(distribution).map(([status, value]) => ({
        name: statusLabels[status] ?? status,
        value: Number(value),
      }));
      setDistributionData(distributionChart);

      const trend = trendsResponse.data?.data ?? trendsResponse.data ?? [];
      const formatter = new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        day: '2-digit',
      });
      setTrendData(
        trend.map((item: { date: string; count: string | number }) => ({
          date: item.date,
          count: Number(item.count),
          label: formatter.format(new Date(item.date)),
        })),
      );
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('No se pudo cargar la información de reportes. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const chatsTrendChart = useMemo(
    () =>
      trendData.map((item: any) => ({
        name: item.label || item.date,
        total: item.count,
      })),
    [trendData],
  );

  const agentsChartData = useMemo(
    () =>
      agentsPerformance.map((agent) => ({
        name: agent.name || agent.email,
        chats: agent.currentChats,
        messages: agent.messagesSent,
      })),
    [agentsPerformance],
  );

  const resolvedChats = distributionData.find((item) => item.name.includes('Resuelto'))?.value ?? 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />

        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                Reportes y Estadísticas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Análisis detallado del rendimiento del sistema
              </Typography>
            </Box>
            <TextField
              select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="today">Hoy</MenuItem>
              <MenuItem value="week">Esta semana</MenuItem>
              <MenuItem value="month">Este mes</MenuItem>
              <MenuItem value="year">Este año</MenuItem>
            </TextField>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Quick Stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3,
              mb: 3,
            }}
          >
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                  {systemStats?.totalChats ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Total de chats
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                  {systemStats?.activeChats ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Chats activos
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                  {resolvedChats}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Resueltos
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                  {formatDuration(systemMetrics?.averageResponseTime)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Tiempo promedio de respuesta
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="Chats" />
              <Tab label="Agentes" />
              <Tab label="Estados" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Evolución de chats
                </Typography>
                {chatsTrendChart.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chatsTrendChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={2} name="Chats" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary">No hay datos para el rango seleccionado.</Typography>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Rendimiento de agentes
                </Typography>
                {agentsChartData.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="chats" fill="#667eea" name="Chats activos" />
                      <Bar dataKey="messages" fill="#764ba2" name="Mensajes enviados" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary">No hay agentes con datos para este periodo.</Typography>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Distribución por estado
                </Typography>
                {distributionData.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary">Aún no hay distribución registrada.</Typography>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
