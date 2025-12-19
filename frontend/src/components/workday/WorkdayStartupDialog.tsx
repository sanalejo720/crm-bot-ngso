// Workday Startup Dialog Component - NGS&O CRM
// Dialog para forzar inicio de jornada laboral al iniciar sesión

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Login, AccessTime, Warning } from '@mui/icons-material';
import api from '../../services/api';

interface WorkdayStartupDialogProps {
  open: boolean;
  onWorkdayStarted: () => void;
}

export default function WorkdayStartupDialog({ open, onWorkdayStarted }: WorkdayStartupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartWorkday = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/workday/clock-in', { notes: 'Inicio automático de jornada' });
      onWorkdayStarted();
    } catch (err: any) {
      console.error('Error starting workday:', err);
      setError(err.response?.data?.message || 'Error al iniciar jornada laboral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 24,
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <AccessTime />
        <Typography variant="h6">Inicio de Jornada Laboral</Typography>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Warning sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            ¡Bienvenido!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Para comenzar a trabajar, debes iniciar tu jornada laboral.
            Al hacerlo, tu estado cambiará automáticamente a <strong>Disponible</strong> y 
            podrás recibir chats de clientes.
          </Typography>

          <Box sx={{ 
            bgcolor: 'info.light', 
            p: 2, 
            borderRadius: 2,
            color: 'info.contrastText'
          }}>
            <Typography variant="body2">
              💡 <strong>Recuerda:</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ textAlign: 'left', mt: 1 }}>
              <li>Al iniciar jornada quedarás en estado <strong>Disponible</strong></li>
              <li>Si tomas un descanso (baño, break, almuerzo), tu estado cambiará a <strong>En pausa</strong></li>
              <li>Cuando alcances el máximo de chats, quedarás en <strong>Ocupado</strong></li>
              <li>Al finalizar jornada, tu estado será <strong>Desconectado</strong></li>
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
          onClick={handleStartWorkday}
          disabled={loading}
          fullWidth
          sx={{ py: 1.5 }}
        >
          {loading ? 'Iniciando...' : 'Iniciar Jornada Laboral'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
