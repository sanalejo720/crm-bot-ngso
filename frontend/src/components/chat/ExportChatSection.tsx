// Export Chat Section - Cierre de Negociación
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  Send,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../services/api';

interface ExportChatSectionProps {
  chatId: string;
  clientName: string;
  collectionStatus?: string;
}

export default function ExportChatSection({ chatId, collectionStatus }: ExportChatSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [closureType, setClosureType] = useState<'paid' | 'promise'>(
    collectionStatus === 'paid' ? 'paid' : 'promise'
  );
  const [ticketNumber, setTicketNumber] = useState('');

  const handleOpenConfirm = () => {
    setShowConfirmDialog(true);
  };

  const handleSendClosure = async () => {
    try {
      setIsExporting(true);
      setShowConfirmDialog(false);
      
      const response = await api.post(`/chats/${chatId}/export-pdf`, {
        closureType,
      });
      
      if (response.data.success) {
        setTicketNumber(response.data.data.ticketNumber);
        setShowSuccessDialog(true);
        
        // El backend automáticamente:
        // 1. Cierra el chat
        // 2. Envía contraseña del PDF a supervisores por email
        // 3. Envía mensaje de despedida al cliente con ticket
      }
    } catch (error: any) {
      console.error('Error enviando cierre:', error);
      alert('Error al enviar el cierre de negociación. Por favor intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Send sx={{ color: '#2e7d32', mr: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            Cierre de Negociación
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envía el cierre de negociación con evidencias a supervisores
        </Typography>

        <Button
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={16} /> : <Send />}
          onClick={handleOpenConfirm}
          disabled={isExporting}
          fullWidth
          sx={{
            bgcolor: '#2e7d32',
            '&:hover': { bgcolor: '#1b5e20' },
          }}
        >
          {isExporting ? 'Enviando...' : 'Enviar Cierre de Negociación'}
        </Button>
      </Paper>

      {/* Dialog de confirmación */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          Confirmar Cierre de Negociación
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Esta acción generará un PDF cifrado con el historial de la conversación 
            y enviará la contraseña de acceso a todos los supervisores por correo electrónico.
          </Alert>

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>
              Tipo de cierre:
            </FormLabel>
            <RadioGroup
              value={closureType}
              onChange={(e) => setClosureType(e.target.value as 'paid' | 'promise')}
            >
              <FormControlLabel
                value="paid"
                control={<Radio />}
                label="Pago Realizado (Se generará paz y salvo)"
              />
              <FormControlLabel
                value="promise"
                control={<Radio />}
                label="Promesa de Pago (Se enviará fecha límite)"
              />
            </RadioGroup>
          </FormControl>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>El chat se cerrará automáticamente</strong> y se enviará un mensaje 
            de despedida al cliente con el número de seguimiento.
          </Alert>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowConfirmDialog(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleSendClosure}
            variant="contained"
            startIcon={<Send />}
            sx={{
              bgcolor: '#2e7d32',
              '&:hover': { bgcolor: '#1b5e20' },
            }}
          >
            Confirmar y Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de éxito */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle sx={{ mr: 1 }} />
            Cierre Enviado Exitosamente
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            El cierre de negociación ha sido enviado exitosamente a los supervisores.
          </Alert>

          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Número de Ticket:
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#2e7d32' }}>
              {ticketNumber}
            </Typography>
          </Box>

          <Alert severity="info">
            <strong>¿Qué sucedió?</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Se generó un PDF cifrado con el historial completo</li>
              <li>La contraseña fue enviada por correo a los supervisores</li>
              <li>El chat ha sido cerrado automáticamente</li>
              <li>Se envió un mensaje de despedida al cliente con el ticket</li>
            </ul>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setShowSuccessDialog(false)}
            variant="contained"
            sx={{
              bgcolor: '#2e7d32',
              '&:hover': { bgcolor: '#1b5e20' },
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
