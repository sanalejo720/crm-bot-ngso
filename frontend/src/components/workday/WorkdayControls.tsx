// Workday Controls Component - NGS&O CRM
// Control de jornada laboral para agentes

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Menu,
  MenuItem,
  Chip,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  AccessTime,
  Login,
  Logout,
  PauseCircle,
  PlayCircle,
  Coffee,
  Restaurant,
  Wc,
  MeetingRoom,
  MoreHoriz,
} from '@mui/icons-material';
import api from '../../services/api';

interface WorkdayData {
  id: string;
  agentId: string;
  workDate: string;
  clockInTime: string;
  clockOutTime: string | null;
  currentStatus: 'offline' | 'working' | 'on_pause';
  totalWorkMinutes: number;
  totalPauseMinutes: number;
  totalProductiveMinutes: number;
  chatsHandled: number;
  messagesSent: number;
  pauses?: Array<{
    id: string;
    pauseType: string;
    startTime: string;
    endTime: string | null;
    durationMinutes: number;
    reason: string | null;
  }>;
}

const pauseTypes = [
  { type: 'lunch', label: 'Almuerzo', icon: <Restaurant />, color: '#FF9800' },
  { type: 'break', label: 'Break', icon: <Coffee />, color: '#4CAF50' },
  { type: 'bathroom', label: 'Baño', icon: <Wc />, color: '#2196F3' },
  { type: 'meeting', label: 'Reunión', icon: <MeetingRoom />, color: '#9C27B0' },
  { type: 'other', label: 'Otro', icon: <MoreHoriz />, color: '#607D8B' },
];

export default function WorkdayControls() {
  const [workday, setWorkday] = useState<WorkdayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pauseMenuAnchor, setPauseMenuAnchor] = useState<null | HTMLElement>(null);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; type: 'clock-in' | 'clock-out' | null }>({
    open: false,
    type: null,
  });
  const [notes, setNotes] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseReasonDialog, setPauseReasonDialog] = useState<{ open: boolean; pauseType: string | null }>({
    open: false,
    pauseType: null,
  });

  // Cargar datos de jornada actual
  const loadCurrentWorkday = async () => {
    try {
      const response = await api.get('/workday/current');
      // El API devuelve { success, data, timestamp } donde data contiene la jornada o null
      setWorkday(response.data.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error loading workday:', error);
      }
      setWorkday(null);
    }
  };

  useEffect(() => {
    loadCurrentWorkday();
    // Actualizar cada minuto
    const interval = setInterval(loadCurrentWorkday, 60000);
    return () => clearInterval(interval);
  }, []);

  // Registrar entrada
  const handleClockIn = async () => {
    try {
      setLoading(true);
      await api.post('/workday/clock-in', { notes });
      await loadCurrentWorkday();
      setNotesDialog({ open: false, type: null });
      setNotes('');
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Error al registrar entrada');
    } finally {
      setLoading(false);
    }
  };

  // Registrar salida
  const handleClockOut = async () => {
    try {
      setLoading(true);
      await api.post('/workday/clock-out', { notes });
      await loadCurrentWorkday();
      setNotesDialog({ open: false, type: null });
      setNotes('');
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar pausa
  const handleStartPause = async (pauseType: string) => {
    try {
      setLoading(true);
      await api.post('/workday/pause/start', { pauseType, reason: pauseReason });
      await loadCurrentWorkday();
      setPauseMenuAnchor(null);
      setPauseReasonDialog({ open: false, pauseType: null });
      setPauseReason('');
    } catch (error) {
      console.error('Error starting pause:', error);
      alert('Error al iniciar pausa');
    } finally {
      setLoading(false);
    }
  };

  // Finalizar pausa
  const handleEndPause = async () => {
    if (!workday?.pauses) return;
    const activePause = workday.pauses.find((p) => !p.endTime);
    if (!activePause) return;

    try {
      setLoading(true);
      await api.post('/workday/pause/end', { pauseId: activePause.id });
      await loadCurrentWorkday();
    } catch (error) {
      console.error('Error ending pause:', error);
      alert('Error al finalizar pausa');
    } finally {
      setLoading(false);
    }
  };

  // Calcular tiempo transcurrido
  const getElapsedTime = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  // Obtener pausa activa
  const activePause = workday?.pauses?.find((p) => !p.endTime);
  const pauseTypeData = activePause ? pauseTypes.find((pt) => pt.type === activePause.pauseType) : null;

  return (
    <Card sx={{ maxWidth: 350, boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Jornada Laboral
          </Typography>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {!workday || !workday.clockInTime ? (
          // No hay jornada activa - mostrar botón de entrada
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No has iniciado tu jornada laboral
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<Login />}
              onClick={() => setNotesDialog({ open: true, type: 'clock-in' })}
              disabled={loading}
              fullWidth
            >
              Registrar Entrada
            </Button>
          </Box>
        ) : (
          // Jornada activa
          <Box>
            {/* Estado actual */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Estado:
              </Typography>
              {workday.currentStatus === 'working' && (
                <Chip label="Trabajando" color="success" icon={<PlayCircle />} />
              )}
              {workday.currentStatus === 'on_pause' && pauseTypeData && (
                <Chip
                  label={`Pausa: ${pauseTypeData.label}`}
                  sx={{ bgcolor: pauseTypeData.color, color: 'white' }}
                  icon={pauseTypeData.icon}
                />
              )}
            </Box>

            {/* Hora de entrada */}
            <Typography variant="body2" color="text.secondary">
              Entrada: <strong>{new Date(workday.clockInTime).toLocaleTimeString('es-CO')}</strong>
            </Typography>

            {/* Tiempo trabajado */}
            <Typography variant="body2" color="text.secondary">
              Tiempo trabajado: <strong>{getElapsedTime(workday.clockInTime)}</strong>
            </Typography>

            {/* Estadísticas */}
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" display="block">
                Chats atendidos: <strong>{workday.chatsHandled || 0}</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Mensajes enviados: <strong>{workday.messagesSent || 0}</strong>
              </Typography>
            </Box>

            {/* Pausa activa */}
            {activePause && pauseTypeData && (
              <Box sx={{ mt: 2, p: 2, bgcolor: pauseTypeData.color, borderRadius: 1, color: 'white' }}>
                <Typography variant="body2" gutterBottom>
                  ⏸️ En pausa: {pauseTypeData.label}
                </Typography>
                <Typography variant="caption">
                  Tiempo: {getElapsedTime(activePause.startTime)}
                </Typography>
              </Box>
            )}

            {/* Botones de control */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              {workday.currentStatus === 'working' ? (
                <>
                  <Tooltip title="Iniciar pausa">
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<PauseCircle />}
                      onClick={(e) => setPauseMenuAnchor(e.currentTarget)}
                      disabled={loading}
                      fullWidth
                    >
                      Pausa
                    </Button>
                  </Tooltip>
                  <Tooltip title="Registrar salida">
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Logout />}
                      onClick={() => setNotesDialog({ open: true, type: 'clock-out' })}
                      disabled={loading}
                      fullWidth
                    >
                      Salida
                    </Button>
                  </Tooltip>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayCircle />}
                  onClick={handleEndPause}
                  disabled={loading}
                  fullWidth
                >
                  Reanudar Trabajo
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Menú de tipos de pausa */}
        <Menu
          anchorEl={pauseMenuAnchor}
          open={Boolean(pauseMenuAnchor)}
          onClose={() => setPauseMenuAnchor(null)}
        >
          {pauseTypes.map((pt) => (
            <MenuItem
              key={pt.type}
              onClick={() => {
                setPauseMenuAnchor(null);
                setPauseReasonDialog({ open: true, pauseType: pt.type });
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {pt.icon}
                <Typography>{pt.label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* Dialog para notas de entrada/salida */}
        <Dialog open={notesDialog.open} onClose={() => setNotesDialog({ open: false, type: null })}>
          <DialogTitle>
            {notesDialog.type === 'clock-in' ? 'Registrar Entrada' : 'Registrar Salida'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Notas (opcional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotesDialog({ open: false, type: null })}>Cancelar</Button>
            <Button
              onClick={notesDialog.type === 'clock-in' ? handleClockIn : handleClockOut}
              variant="contained"
              color={notesDialog.type === 'clock-in' ? 'success' : 'error'}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para razón de pausa */}
        <Dialog
          open={pauseReasonDialog.open}
          onClose={() => setPauseReasonDialog({ open: false, pauseType: null })}
        >
          <DialogTitle>Iniciar Pausa</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Motivo (opcional)"
              type="text"
              fullWidth
              multiline
              rows={2}
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPauseReasonDialog({ open: false, pauseType: null })}>Cancelar</Button>
            <Button
              onClick={() => pauseReasonDialog.pauseType && handleStartPause(pauseReasonDialog.pauseType)}
              variant="contained"
              color="warning"
            >
              Iniciar Pausa
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
