import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  AccessTime,
  CalendarToday,
  Restaurant,
  Coffee,
  Wc,
  MeetingRoom,
  MoreHoriz,
  Chat,
} from '@mui/icons-material';
import api from '../../services/api';

interface PauseBreakdown {
  lunch: number;
  break: number;
  bathroom: number;
  meeting: number;
  other: number;
}

interface CurrentWorkday {
  id: number;
  clockIn: string;
  clockOut: string | null;
  totalWorkMinutes: number;
  totalPauseMinutes: number;
  productiveMinutes: number;
  chatsHandled: number;
  pauseBreakdown: PauseBreakdown;
}

interface MonthlyStats {
  totalDaysWorked: number;
  averageWorkMinutes: number;
  averagePauseMinutes: number;
  averageProductiveMinutes: number;
  totalChatsHandled: number;
  pauseBreakdown: PauseBreakdown;
}

const WorkdayStats: React.FC = () => {
  const [currentWorkday, setCurrentWorkday] = useState<CurrentWorkday | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkdayData();
  }, []);

  const fetchWorkdayData = async () => {
    try {
      setLoading(true);

      const [currentRes, statsRes] = await Promise.all([
        api.get('/workday/current').catch(() => ({ data: null })),
        api.get('/workday/stats').catch(() => ({ data: null }))
      ]);

      setCurrentWorkday(currentRes.data);
      setMonthlyStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching workday data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getPauseIcon = (type: string) => {
    switch (type) {
      case 'lunch': return <Restaurant />;
      case 'break': return <Coffee />;
      case 'bathroom': return <Wc />;
      case 'meeting': return <MeetingRoom />;
      default: return <MoreHoriz />;
    }
  };

  const getPauseColor = (type: string): string => {
    switch (type) {
      case 'lunch': return '#ff9800';
      case 'break': return '#2196f3';
      case 'bathroom': return '#9c27b0';
      case 'meeting': return '#4caf50';
      default: return '#757575';
    }
  };

  const getPauseLabel = (type: string): string => {
    switch (type) {
      case 'lunch': return 'Almuerzo';
      case 'break': return 'Descanso';
      case 'bathroom': return 'Baño';
      case 'meeting': return 'Reunión';
      default: return 'Otro';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Estadísticas de Jornada
      </Typography>

      {/* Current Workday Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime /> Jornada Actual
        </Typography>
        
        {currentWorkday ? (
          <Box>
            {/* Main Stats Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Entrada
                  </Typography>
                  <Typography variant="h5">
                    {formatDateTime(currentWorkday.clockIn)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Tiempo Total
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatTime(currentWorkday.totalWorkMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Tiempo Productivo
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatTime(currentWorkday.productiveMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pausas
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatTime(currentWorkday.totalPauseMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chat fontSize="small" /> Chats Atendidos
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {currentWorkday.chatsHandled}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Pause Breakdown */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Desglose de Pausas
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.entries(currentWorkday.pauseBreakdown).map(([type, minutes]) => (
                    <Box 
                      key={type}
                      sx={{ 
                        flex: '1 1 150px',
                        minWidth: '150px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.default'
                      }}
                    >
                      <Box sx={{ color: getPauseColor(type), mb: 1 }}>
                        {getPauseIcon(type)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {getPauseLabel(type)}
                      </Typography>
                      <Typography variant="h6" sx={{ color: getPauseColor(type) }}>
                        {formatTime(minutes)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Card>
            <CardContent>
              <Typography color="text.secondary">
                No hay jornada activa
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Monthly Stats Section */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday /> Estadísticas del Mes
        </Typography>

        {monthlyStats ? (
          <Box>
            {/* Monthly Summary Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Días Trabajados
                  </Typography>
                  <Typography variant="h5">
                    {monthlyStats.totalDaysWorked}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Tiempo Promedio
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatTime(monthlyStats.averageWorkMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Productivo Promedio
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatTime(monthlyStats.averageProductiveMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pausas Promedio
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatTime(monthlyStats.averagePauseMinutes)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chat fontSize="small" /> Total Chats
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {monthlyStats.totalChatsHandled}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Monthly Pause Breakdown */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Desglose de Pausas Mensual
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.entries(monthlyStats.pauseBreakdown).map(([type, minutes]) => (
                    <Box 
                      key={type}
                      sx={{ 
                        flex: '1 1 150px',
                        minWidth: '150px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.default'
                      }}
                    >
                      <Box sx={{ color: getPauseColor(type), mb: 1 }}>
                        {getPauseIcon(type)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {getPauseLabel(type)}
                      </Typography>
                      <Typography variant="h6" sx={{ color: getPauseColor(type) }}>
                        {formatTime(minutes)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Card>
            <CardContent>
              <Typography color="text.secondary">
                No hay estadísticas disponibles
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default WorkdayStats;
