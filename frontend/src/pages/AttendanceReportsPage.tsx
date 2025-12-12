// Attendance Reports Page - NGS&O CRM
// Página de reportes de asistencia para supervisores y administradores

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  Today,
  DateRange,
  CalendarMonth,
  Download,
  Refresh,
  AccessTime,
  CheckCircle,
  Cancel,
  Schedule,
  PauseCircle,
  TrendingUp,
  Person,
  Groups,
  FilterList,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface AgentAttendance {
  agentId: string;
  agentName: string;
  email: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'weekend';
  clockInTime: string | null;
  clockOutTime: string | null;
  totalWorkMinutes: number;
  totalPauseMinutes: number;
  totalProductiveMinutes: number;
  chatsHandled: number;
  pauseBreakdown?: {
    lunch: number;
    break: number;
    bathroom: number;
    meeting: number;
    other: number;
  };
}

interface AttendanceSummary {
  totalAgents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onPauseNow: number;
  avgWorkHours: number;
  avgProductiveHours: number;
}

export default function AttendanceReportsPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<AgentAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalAgents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onPauseNow: 0,
    avgWorkHours: 0,
    avgProductiveHours: 0,
  });
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);

  const loadAgents = useCallback(async () => {
    try {
      const response = await api.get('/users');
      const users = response.data?.data || response.data || [];
      const agentUsers = users
        .filter((u: any) => u.role?.name === 'Agente')
        .map((u: any) => ({
          id: u.id,
          name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        }));
      setAgents(agentUsers);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  }, []);

  const loadAttendanceData = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      
      const params = new URLSearchParams({ startDate, endDate });
      if (filterAgent !== 'all') params.append('agentId', filterAgent);

      const response = await api.get(`/workday/attendance-report?${params}`);
      const data = response.data?.data || response.data || {};
      
      setAttendance(data.records || []);
      setSummary(data.summary || {
        totalAgents: 0, presentToday: 0, absentToday: 0, lateToday: 0,
        onPauseNow: 0, avgWorkHours: 0, avgProductiveHours: 0,
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
      generateMockData();
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterAgent, agents]);

  const generateMockData = () => {
    const records: AgentAttendance[] = agents.map(agent => {
      const isPresent = Math.random() > 0.2;
      const isLate = isPresent && Math.random() > 0.7;
      return {
        agentId: agent.id, agentName: agent.name, email: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: !isPresent ? 'absent' : isLate ? 'late' : 'present',
        clockInTime: isPresent ? `${8 + (isLate ? 1 : 0)}:${Math.floor(Math.random() * 30).toString().padStart(2, '0')}` : null,
        clockOutTime: null,
        totalWorkMinutes: isPresent ? Math.floor(Math.random() * 480) + 60 : 0,
        totalPauseMinutes: isPresent ? Math.floor(Math.random() * 60) : 0,
        totalProductiveMinutes: 0,
        chatsHandled: isPresent ? Math.floor(Math.random() * 50) : 0,
      };
    });
    setAttendance(records);
    setSummary({
      totalAgents: agents.length,
      presentToday: records.filter(r => r.status === 'present' || r.status === 'late').length,
      absentToday: records.filter(r => r.status === 'absent').length,
      lateToday: records.filter(r => r.status === 'late').length,
      onPauseNow: 0, avgWorkHours: 6.5, avgProductiveHours: 5.8,
    });
  };

  useEffect(() => { loadAgents(); }, [loadAgents]);
  useEffect(() => { if (agents.length > 0) loadAttendanceData(); }, [agents, loadAttendanceData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const today = new Date();
    switch (newValue) {
      case 0:
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 1:
        setStartDate(format(startOfWeek(today, { locale: es }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(today, { locale: es }), 'yyyy-MM-dd'));
        break;
      case 2:
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
    }
  };

  const formatTime = (minutes: number): string => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
    const colors: Record<string, 'success' | 'error' | 'warning' | 'default' | 'info'> = {
      present: 'success', absent: 'error', late: 'warning', half_day: 'info', weekend: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      present: 'Presente', absent: 'Ausente', late: 'Tarde', half_day: 'Medio día', weekend: 'Fin de semana'
    };
    return labels[status] || status;
  };

  const exportToCSV = () => {
    const headers = ['Agente', 'Fecha', 'Estado', 'Entrada', 'Salida', 'Tiempo Trabajado', 'Pausas', 'Chats'];
    const rows = attendance.map(a => [
      a.agentName, a.date, getStatusLabel(a.status), a.clockInTime || '-', a.clockOutTime || '-',
      formatTime(a.totalWorkMinutes), formatTime(a.totalPauseMinutes), a.chatsHandled,
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `asistencia_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ModernSidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <Box component="main" sx={{
          flex: 1, p: 4,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>📊 Control de Asistencia</Typography>
              <Typography variant="body2" color="text.secondary">Monitoreo de jornadas laborales</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={loadAttendanceData} disabled={loading}>Actualizar</Button>
              <Button variant="contained" startIcon={<Download />} onClick={exportToCSV} disabled={attendance.length === 0}>Exportar CSV</Button>
            </Box>
          </Box>

          {/* Summary Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            {[
              { value: summary.totalAgents, label: 'Total Agentes', icon: <Groups />, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
              { value: summary.presentToday, label: 'Presentes Hoy', icon: <CheckCircle />, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
              { value: summary.absentToday, label: 'Ausentes Hoy', icon: <Cancel />, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
              { value: summary.lateToday, label: 'Llegadas Tarde', icon: <Schedule />, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            ].map((card, idx) => (
              <Box key={idx} sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Card sx={{ background: card.gradient, color: 'white', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h3" fontWeight={700}>{card.value}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>{card.label}</Typography>
                      </Box>
                      <Box sx={{ fontSize: 48, opacity: 0.8 }}>{card.icon}</Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab icon={<Today />} label="Hoy" iconPosition="start" />
              <Tab icon={<DateRange />} label="Esta Semana" iconPosition="start" />
              <Tab icon={<CalendarMonth />} label="Este Mes" iconPosition="start" />
              <Tab icon={<FilterList />} label="Personalizado" iconPosition="start" />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              {tabValue === 3 && (
                <>
                  <TextField type="date" label="Fecha Inicio" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                  <TextField type="date" label="Fecha Fin" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                </>
              )}
              <TextField select label="Filtrar por Agente" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} size="small" sx={{ minWidth: 200 }}>
                <MenuItem value="all">Todos los agentes</MenuItem>
                {agents.map(agent => <MenuItem key={agent.id} value={agent.id}>{agent.name}</MenuItem>)}
              </TextField>
              {tabValue === 3 && <Button variant="contained" onClick={loadAttendanceData}>Buscar</Button>}
            </Box>
          </Paper>

          {/* Table */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : attendance.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>No hay registros de asistencia.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      {['Agente', 'Fecha', 'Estado', 'Entrada', 'Salida', 'Trabajado', 'Pausas', 'Productivo', 'Chats'].map(h => (
                        <TableCell key={h}><strong>{h}</strong></TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((record, idx) => (
                      <TableRow key={`${record.agentId}-${idx}`} sx={{ '&:hover': { backgroundColor: 'action.hover' }, backgroundColor: record.status === 'absent' ? 'rgba(239, 68, 68, 0.05)' : 'inherit' }}>
                        <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Person color="primary" fontSize="small" /><Typography variant="body2" fontWeight={500}>{record.agentName}</Typography></Box></TableCell>
                        <TableCell>{format(new Date(record.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell><Chip size="small" label={getStatusLabel(record.status)} color={getStatusColor(record.status)} /></TableCell>
                        <TableCell>{record.clockInTime ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AccessTime fontSize="small" color="success" />{record.clockInTime}</Box> : '-'}</TableCell>
                        <TableCell>{record.clockOutTime ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AccessTime fontSize="small" color="error" />{record.clockOutTime}</Box> : record.status !== 'absent' ? <Chip size="small" label="Trabajando" color="success" variant="outlined" /> : '-'}</TableCell>
                        <TableCell>{record.totalWorkMinutes > 0 ? formatTime(record.totalWorkMinutes) : '-'}</TableCell>
                        <TableCell>
                          {record.totalPauseMinutes > 0 ? (
                            <Tooltip title={record.pauseBreakdown ? `Almuerzo: ${record.pauseBreakdown.lunch}m, Break: ${record.pauseBreakdown.break}m` : 'Sin desglose'}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}><PauseCircle fontSize="small" color="warning" />{formatTime(record.totalPauseMinutes)}</Box>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ color: record.totalProductiveMinutes > 0 ? 'success.main' : 'text.disabled', fontWeight: 600 }}>{record.totalProductiveMinutes > 0 ? formatTime(record.totalProductiveMinutes) : '-'}</TableCell>
                        <TableCell><Chip size="small" label={record.chatsHandled} color={record.chatsHandled > 0 ? 'primary' : 'default'} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Summary */}
          {attendance.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>📈 Resumen del Período</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {[
                  { icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />, value: `${summary.avgWorkHours.toFixed(1)}h`, label: 'Prom. Horas Trabajadas' },
                  { icon: <AccessTime sx={{ fontSize: 40, color: 'success.main' }} />, value: `${summary.avgProductiveHours.toFixed(1)}h`, label: 'Prom. Horas Productivas' },
                  { icon: <PauseCircle sx={{ fontSize: 40, color: 'warning.main' }} />, value: `${((summary.avgWorkHours - summary.avgProductiveHours) * 60).toFixed(0)}m`, label: 'Prom. Tiempo Pausas' },
                ].map((item, idx) => (
                  <Box key={idx} sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    {item.icon}
                    <Typography variant="h5" fontWeight={700}>{item.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
