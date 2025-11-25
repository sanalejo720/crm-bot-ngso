// Session Monitoring Dashboard - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PowerOff as PowerOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Timer as TimerIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface SessionStats {
  numberId: string;
  phoneNumber: string;
  displayName: string;
  status: string;
  isConnected: boolean;
  messagesSent: number;
  messagesReceived: number;
  totalMessages: number;
  lastMessageAt?: string;
  connectedSince?: string;
  uptime?: number;
  alertCount?: number;
  offensiveWordsDetected?: number;
}

interface ActiveSessions {
  totalSessions: number;
  activeSessions: number;
  maxSessions: number;
  sessions: SessionStats[];
  uptimeAverage: number;
}

interface NumberRanking {
  numberId: string;
  phoneNumber: string;
  displayName: string;
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  lastMessageAt: string;
}

const SessionMonitoring: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<ActiveSessions | null>(null);
  const [ranking, setRanking] = useState<NumberRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionStats | null>(null);
  const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false);
  const [processingClose, setProcessingClose] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [sessionsRes, rankingRes] = await Promise.all([
        api.get('/whatsapp-numbers/sessions/active'),
        api.get('/monitoring/numbers/ranking?limit=10&days=7'),
      ]);
      setActiveSessions(sessionsRes.data);
      setRanking(Array.isArray(rankingRes.data) ? rankingRes.data : (rankingRes.data?.data || []));
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (session: SessionStats) => {
    setSelectedSession(session);
    setCloseDialogOpen(true);
  };

  const confirmCloseSession = async () => {
    if (!selectedSession) return;

    setProcessingClose(true);
    try {
      await api.post(`/whatsapp-numbers/${selectedSession.numberId}/session/close`);
      setCloseDialogOpen(false);
      setSelectedSession(null);
      await loadData();
      alert('Sesión cerrada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cerrar sesión');
    } finally {
      setProcessingClose(false);
    }
  };

  const handleCloseAllSessions = () => {
    setCloseAllDialogOpen(true);
  };

  const confirmCloseAllSessions = async () => {
    setProcessingClose(true);
    try {
      const response = await api.post('/whatsapp-numbers/sessions/close-all');
      setCloseAllDialogOpen(false);
      await loadData();
      alert(response.data.message);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cerrar sesiones');
    } finally {
      setProcessingClose(false);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'default';
      case 'qr_waiting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'qr_waiting':
        return <WarningIcon />;
      default:
        return null;
    }
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
            📊 Monitoreo de Sesiones WhatsApp
          </Typography>
          <Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PowerOffIcon />}
              onClick={handleCloseAllSessions}
              disabled={!activeSessions || activeSessions.activeSessions === 0}
              sx={{ mr: 2 }}
            >
              Cerrar Todas
            </Button>
            <IconButton onClick={loadData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Sesiones
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {activeSessions?.totalSessions || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                Sesiones Activas
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="white">
                {activeSessions?.activeSessions || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Límite Máximo
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {activeSessions?.maxSessions || 0}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Uptime Promedio
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {formatUptime(activeSessions?.uptimeAverage || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Usage Progress */}
        {activeSessions && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="h6">Uso de Capacidad</Typography>
                <Typography variant="body2" color="textSecondary">
                  {activeSessions.activeSessions} / {activeSessions.maxSessions} sesiones
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(activeSessions.activeSessions / activeSessions.maxSessions) * 100}
                sx={{ height: 10, borderRadius: 5 }}
                color={
                  activeSessions.activeSessions >= activeSessions.maxSessions
                    ? 'error'
                    : activeSessions.activeSessions >= activeSessions.maxSessions * 0.8
                    ? 'warning'
                    : 'primary'
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Sessions Table */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sesiones Activas
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Estado</TableCell>
                    <TableCell>Número</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">
                      <MessageIcon fontSize="small" /> Mensajes
                    </TableCell>
                    <TableCell align="center">
                      <TimerIcon fontSize="small" /> Uptime
                    </TableCell>
                    <TableCell align="center">
                      <ShieldIcon fontSize="small" /> Alertas
                    </TableCell>
                    <TableCell>Último Mensaje</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(activeSessions?.sessions || []).map((session) => (
                    <TableRow key={session.numberId}>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(session.status) || undefined}
                          label={session.status}
                          color={getStatusColor(session.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{session.phoneNumber}</TableCell>
                      <TableCell>{session.displayName}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={`Enviados: ${session.messagesSent} | Recibidos: ${session.messagesReceived}`}>
                          <Chip
                            label={session.totalMessages}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">{formatUptime(session.uptime)}</TableCell>
                      <TableCell align="center">
                        {session.alertCount && session.alertCount > 0 ? (
                          <Chip
                            label={session.alertCount}
                            size="small"
                            color="error"
                            icon={<WarningIcon />}
                          />
                        ) : (
                          <Chip label="0" size="small" color="success" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(session.lastMessageAt)}</TableCell>
                      <TableCell align="center">
                        {session.isConnected && (
                          <Tooltip title="Cerrar sesión">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCloseSession(session)}
                            >
                              <PowerOffIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!activeSessions?.sessions || activeSessions.sessions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="textSecondary">No hay sesiones registradas</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Activity Ranking */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUpIcon /> Top 10 Números con Mayor Actividad (Últimos 7 días)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Número</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">Total Mensajes</TableCell>
                    <TableCell align="center">Enviados</TableCell>
                    <TableCell align="center">Recibidos</TableCell>
                    <TableCell>Último Mensaje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(ranking || []).map((item, index) => (
                    <TableRow key={item.numberId}>
                      <TableCell>
                        <Chip
                          label={index + 1}
                          size="small"
                          color={index === 0 ? 'warning' : index < 3 ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{item.phoneNumber}</TableCell>
                      <TableCell>{item.displayName}</TableCell>
                      <TableCell align="center">
                        <Typography fontWeight="bold">{item.totalMessages}</Typography>
                      </TableCell>
                      <TableCell align="center">{item.messagesSent}</TableCell>
                      <TableCell align="center">{item.messagesReceived}</TableCell>
                      <TableCell>{formatDate(item.lastMessageAt)}</TableCell>
                    </TableRow>
                  ))}
                  {ranking.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">No hay datos de actividad</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Close Session Dialog */}
        <Dialog open={closeDialogOpen} onClose={() => !processingClose && setCloseDialogOpen(false)}>
          <DialogTitle>Cerrar Sesión</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              ¿Estás seguro que deseas cerrar esta sesión?
            </Alert>
            {selectedSession && (
              <Box>
                <Typography variant="body1">
                  <strong>Número:</strong> {selectedSession.phoneNumber}
                </Typography>
                <Typography variant="body1">
                  <strong>Nombre:</strong> {selectedSession.displayName}
                </Typography>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Esta acción cerrará la conexión de WhatsApp y se deberá escanear el QR nuevamente
                  para reconectar.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseDialogOpen(false)} disabled={processingClose}>
              Cancelar
            </Button>
            <Button
              onClick={confirmCloseSession}
              color="error"
              variant="contained"
              disabled={processingClose}
            >
              {processingClose ? <CircularProgress size={24} /> : 'Cerrar Sesión'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close All Sessions Dialog */}
        <Dialog
          open={closeAllDialogOpen}
          onClose={() => !processingClose && setCloseAllDialogOpen(false)}
        >
          <DialogTitle>Cerrar Todas las Sesiones</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              ¿Estás seguro que deseas cerrar TODAS las sesiones activas?
            </Alert>
            <Typography variant="body1">
              Se cerrarán <strong>{activeSessions?.activeSessions || 0}</strong> sesiones activas.
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={1}>
              Esta acción cerrará todas las conexiones de WhatsApp. Cada número deberá escanear el
              QR nuevamente para reconectar.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseAllDialogOpen(false)} disabled={processingClose}>
              Cancelar
            </Button>
            <Button
              onClick={confirmCloseAllSessions}
              color="error"
              variant="contained"
              disabled={processingClose}
            >
              {processingClose ? <CircularProgress size={24} /> : 'Cerrar Todas'}
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default SessionMonitoring;
