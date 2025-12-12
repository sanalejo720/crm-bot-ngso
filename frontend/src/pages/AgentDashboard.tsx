// Agent Dashboard - NGS&O CRM Gestión
// Dashboard individual para agentes con sus métricas personales
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Chat,
  CheckCircle,
  Schedule,
  TrendingUp,
  AttachMoney,
  Speed,
} from '@mui/icons-material';
import apiService from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { useAppSelector } from '../hooks/redux';
import WorkdayControls from '../components/workday/WorkdayControls';
import WorkdayStats from '../components/workday/WorkdayStats';

interface AgentStats {
  activeChats: number;
  totalChatsToday: number;
  maxConcurrentChats: number;
  messagesCount: number;
  promisesObtained: number;
  recoveredAmount: number;
  averageResponseTime: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'promise' | 'payment' | 'chat_closed';
  description: string;
  timestamp: string;
  amount?: number;
}

export default function AgentDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<AgentStats>({
    activeChats: 0,
    totalChatsToday: 0,
    maxConcurrentChats: 10,
    messagesCount: 0,
    promisesObtained: 0,
    recoveredAmount: 0,
    averageResponseTime: 0,
    completionRate: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas del agente
  const loadStats = async () => {
    try {
      const response = await apiService.get('/reports/agent/stats');
      const result = response.data || response;
      const data = result.data || result;
      setStats(data);
    } catch (error) {
      console.error('Error loading agent stats:', error);
    }
  };

  // Cargar actividad reciente
  const loadActivity = async () => {
    try {
      const response = await apiService.get('/reports/agent/activity');
      const result = response.data || response;
      const data = result.data || result;
      setActivities(data);
    } catch (error) {
      console.error('Error loading agent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadActivity();

    // Auto-refresh cada 60 segundos
    const interval = setInterval(() => {
      loadStats();
      loadActivity();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'message': return <Chat fontSize="small" />;
      case 'promise': return <Schedule fontSize="small" />;
      case 'payment': return <AttachMoney fontSize="small" />;
      case 'chat_closed': return <CheckCircle fontSize="small" />;
      default: return <Chat fontSize="small" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'message': return 'primary';
      case 'promise': return 'warning';
      case 'payment': return 'success';
      case 'chat_closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Mi Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bienvenido, {user?.firstName || 'Agente'}
        </Typography>
      </Box>

      {/* Sección de Jornada Laboral */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
        <Box>
          <WorkdayControls />
        </Box>
        <Box>
          <WorkdayStats />
        </Box>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3,
        mb: 3 
      }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chat sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.activeChats}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chats Activos
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(stats.activeChats / stats.maxConcurrentChats) * 100}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                de {stats.maxConcurrentChats} máximo
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.messagesCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mensajes Hoy
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {stats.totalChatsToday} chats atendidos
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.promisesObtained}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Promesas de Pago
                  </Typography>
                </Box>
              </Box>
              <Chip 
                icon={<CheckCircle />}
                label={`${stats.completionRate}% completado`}
                size="small"
                color="success"
                variant="outlined"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5">{formatCurrency(stats.recoveredAmount)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recuperado Hoy
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  T. Respuesta: {stats.averageResponseTime}s
                </Typography>
              </Box>
            </CardContent>
          </Card>
      </Box>

      {/* Actividad reciente */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actividad Reciente
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography color="text.secondary">Cargando...</Typography>
          </Box>
        ) : activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography color="text.secondary">
              No hay actividad reciente
            </Typography>
          </Box>
        ) : (
          <List>
            {activities.map((activity) => (
              <ListItem key={activity.id}>
                <Chip
                  icon={getActivityIcon(activity.type)}
                  label={activity.type}
                  size="small"
                  color={getActivityColor(activity.type)}
                  sx={{ mr: 2 }}
                />
                <ListItemText
                  primary={activity.description}
                  secondary={new Date(activity.timestamp).toLocaleString('es-CO')}
                />
                {activity.amount && (
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {formatCurrency(activity.amount)}
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
