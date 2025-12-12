// Modern Agent Dashboard - Inspired by Greeva Template
// Beautiful dashboard with gradient cards and animations

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Chat,
  Message,
  TrendingUp,
  Speed,
  Schedule,
  CheckCircle,
  AttachMoney,
} from '@mui/icons-material';
import apiService from '../services/api';
import { useAppSelector } from '../hooks/redux';
import StatsCard from '../components/common/StatsCard';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import WorkdayControls from '../components/workday/WorkdayControls';

interface AgentStats {
  activeChats: number;
  totalChatsToday: number;
  maxConcurrentChats: number;
  messagesCount: number;
  promisesObtained: number;
  recoveredAmount: number;
  averageResponseTime: number;
  completionRate: number;
  chatsAssigned?: number;
  chatsActive?: number;
  chatsClosed?: number;
  messagesSent?: number;
}

export default function ModernAgentDashboard() {
  const theme = useTheme();
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
  const [, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await apiService.get('/reports/agent/stats');
      const result = response.data || response;
      const data = result.data || result;
      setStats(data);
    } catch (error) {
      console.error('Error loading agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateProgress = () => {
    if (stats.maxConcurrentChats === 0) return 0;
    return Math.round((stats.activeChats / stats.maxConcurrentChats) * 100);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ModernSidebar />
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box
          component="main"
          sx={{
            flex: 1,
            p: 4,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
              : 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
          }}
        >
          {/* Welcome Section */}
          <Box sx={{ mb: 4 }} className="fade-in">
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #2d3748 0%, #ff6b35 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ¡Hola, {user?.firstName || 'Agente'}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Aquí está tu resumen de actividad de hoy
            </Typography>
          </Box>

          {/* Control de Jornada Laboral - Prominente */}
          <Box sx={{ mb: 4 }}>
            <WorkdayControls />
          </Box>

          {/* Stats Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <StatsCard
              title="Chats Activos"
              value={stats.activeChats || stats.chatsActive || 0}
              subtitle="En conversación ahora"
              icon={<Chat sx={{ fontSize: 28 }} />}
              color="primary"
              progress={calculateProgress()}
            />

            <StatsCard
              title="Chats Hoy"
              value={stats.totalChatsToday || stats.chatsAssigned || 0}
              subtitle="Total atendidos"
              icon={<TrendingUp sx={{ fontSize: 28 }} />}
              color="secondary"
              trend={{ value: 12, isPositive: true }}
            />

            <StatsCard
              title="Mensajes"
              value={stats.messagesCount || stats.messagesSent || 0}
              subtitle="Enviados hoy"
              icon={<Message sx={{ fontSize: 28 }} />}
              color="success"
              trend={{ value: 8, isPositive: true }}
            />

            <StatsCard
              title="Chats Cerrados"
              value={stats.chatsClosed || 0}
              subtitle="Completados hoy"
              icon={<CheckCircle sx={{ fontSize: 28 }} />}
              color="info"
            />
          </Box>

          {/* Secondary Stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0px 8px 24px rgba(102, 126, 234, 0.4)',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.averageResponseTime || 0}s
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tiempo Promedio
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Respuesta promedio a clientes
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: 'white',
                boxShadow: '0px 8px 24px rgba(245, 158, 11, 0.4)',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.promisesObtained || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Compromisos
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Compromisos de pago obtenidos
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                boxShadow: '0px 8px 24px rgba(16, 185, 129, 0.4)',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    ${stats.recoveredAmount?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Recuperado
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Monto recuperado hoy
              </Typography>
            </Paper>
          </Box>

          {/* Performance Chart Placeholder */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0px 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Rendimiento Semanal
            </Typography>
            <Box
              sx={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Gráfico de rendimiento próximamente
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
