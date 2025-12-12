// Workday Header Controls - NGS&O CRM
// Controles compactos de jornada laboral para el header

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
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
  KeyboardArrowDown,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateAgentState } from '../../store/slices/authSlice';
import { socketService } from '../../services/socket.service';
import type { AgentState } from '../../types/index';

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

export default function WorkdayHeaderControls() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [workday, setWorkday] = useState<WorkdayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
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
      const workdayData = response.data.data;
      setWorkday(workdayData);
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
      setMenuAnchor(null);
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
      setMenuAnchor(null);
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
      setMenuAnchor(null);
    } catch (error) {
      console.error('Error ending pause:', error);
      alert('Error al finalizar pausa');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado del agente
  const handleChangeStatus = (newState: AgentState) => {
    dispatch(updateAgentState(newState));
    socketService.changeAgentState(newState);
  };

  // Obtener etiqueta de estado
  const getAgentStatusLabel = (state?: AgentState) => {
    switch (state) {
      case 'available': return 'Disponible';
      case 'busy': return 'Ocupado';
      case 'in-break': return 'En descanso';
      case 'offline': return 'Desconectado';
      default: return 'Desconectado'; // Si no hay estado, asumir desconectado
    }
  };

  // Obtener color de estado
  const getAgentStatusColor = (state?: AgentState) => {
    switch (state) {
      case 'available': return '#4CAF50';
      case 'busy': return '#FF9800';
      case 'in-break': return '#2196F3';
      case 'offline': return '#757575';
      default: return '#757575'; // Gris por defecto
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

  // Estado del chip combinado (jornada + estado agente)
  const getStatusChip = () => {
    const agentStatusColor = getAgentStatusColor(user?.agentState);
    const agentStatusLabel = getAgentStatusLabel(user?.agentState);
    
    if (!workday) {
      return (
        <Chip
          icon={<AccessTime />}
          label={`Sin jornada • ${agentStatusLabel}`}
          size="small"
          sx={{ 
            cursor: 'pointer',
            bgcolor: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderLeft: `4px solid ${agentStatusColor}`,
            fontWeight: 500,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
          }}
        />
      );
    }

    if (workday.currentStatus === 'working') {
      return (
        <Chip
          icon={<PlayCircle />}
          label={`Trabajando ${getElapsedTime(workday.clockInTime)} • ${agentStatusLabel}`}
          size="small"
          sx={{ 
            cursor: 'pointer',
            bgcolor: 'rgba(76, 175, 80, 0.2)',
            color: 'white',
            borderLeft: `4px solid ${agentStatusColor}`,
            '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
          }}
        />
      );
    }

    if (workday.currentStatus === 'on_pause' && pauseTypeData) {
      return (
        <Chip
          icon={pauseTypeData.icon}
          label={`${pauseTypeData.label} ${activePause ? getElapsedTime(activePause.startTime) : ''} • ${agentStatusLabel}`}
          size="small"
          sx={{ 
            bgcolor: pauseTypeData.color, 
            color: 'white', 
            cursor: 'pointer',
            borderLeft: `4px solid ${agentStatusColor}`,
            '&:hover': { opacity: 0.9 }
          }}
        />
      );
    }

    return (
      <Chip
        icon={<AccessTime />}
        label={`Estado desconocido • ${agentStatusLabel}`}
        size="small"
        sx={{ 
          cursor: 'pointer',
          bgcolor: 'rgba(255,255,255,0.1)',
          color: 'white',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
        }}
      />
    );
  };

  return (
    <>
      {/* Chip clickeable */}
      <Tooltip title="Control de jornada">
        <Box onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          {getStatusChip()}
          <IconButton size="small" sx={{ ml: 0.5, color: 'white' }}>
            <KeyboardArrowDown fontSize="small" />
          </IconButton>
        </Box>
      </Tooltip>

      {/* Menú principal */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        {/* Información de jornada */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Jornada Laboral
          </Typography>
          {workday && workday.clockInTime ? (
            <>
              <Typography variant="caption" display="block" color="text.secondary">
                Entrada: {new Date(workday.clockInTime).toLocaleTimeString('es-CO')}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Tiempo: {getElapsedTime(workday.clockInTime)}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Chats: {workday.chatsHandled || 0} | Mensajes: {workday.messagesSent || 0}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No has iniciado jornada
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Estado del agente */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Estado del Agente
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <MenuItem 
              onClick={() => handleChangeStatus('available')} 
              selected={user?.agentState === 'available'}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              {user?.agentState === 'available' ? <CheckCircle sx={{ mr: 1, color: '#4CAF50' }} /> : <RadioButtonUnchecked sx={{ mr: 1, color: '#4CAF50' }} />}
              <Typography variant="body2">Disponible</Typography>
            </MenuItem>
            <MenuItem 
              onClick={() => handleChangeStatus('busy')} 
              selected={user?.agentState === 'busy'}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              {user?.agentState === 'busy' ? <CheckCircle sx={{ mr: 1, color: '#FF9800' }} /> : <RadioButtonUnchecked sx={{ mr: 1, color: '#FF9800' }} />}
              <Typography variant="body2">Ocupado</Typography>
            </MenuItem>
            <MenuItem 
              onClick={() => handleChangeStatus('in-break')} 
              selected={user?.agentState === 'in-break'}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              {user?.agentState === 'in-break' ? <CheckCircle sx={{ mr: 1, color: '#2196F3' }} /> : <RadioButtonUnchecked sx={{ mr: 1, color: '#2196F3' }} />}
              <Typography variant="body2">En descanso</Typography>
            </MenuItem>
            <MenuItem 
              onClick={() => handleChangeStatus('offline')} 
              selected={user?.agentState === 'offline'}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              {user?.agentState === 'offline' ? <CheckCircle sx={{ mr: 1, color: '#757575' }} /> : <RadioButtonUnchecked sx={{ mr: 1, color: '#757575' }} />}
              <Typography variant="body2">Desconectado</Typography>
            </MenuItem>
          </Box>
        </Box>

        <Divider />

        {/* Acciones de jornada */}
        {!workday ? (
          <MenuItem onClick={() => setNotesDialog({ open: true, type: 'clock-in' })} disabled={loading}>
            <Login sx={{ mr: 1 }} /> Registrar Entrada
          </MenuItem>
        ) : (
          <>
            {workday.currentStatus === 'working' ? (
              <>
                <MenuItem onClick={(e) => {
                  setMenuAnchor(null);
                  setPauseMenuAnchor(e.currentTarget);
                }} disabled={loading}>
                  <PauseCircle sx={{ mr: 1 }} /> Iniciar Pausa
                </MenuItem>
                <MenuItem onClick={() => setNotesDialog({ open: true, type: 'clock-out' })} disabled={loading}>
                  <Logout sx={{ mr: 1 }} /> Registrar Salida
                </MenuItem>
              </>
            ) : (
              <MenuItem onClick={handleEndPause} disabled={loading}>
                <PlayCircle sx={{ mr: 1 }} /> Reanudar Trabajo
              </MenuItem>
            )}
          </>
        )}
      </Menu>

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
    </>
  );
}
