// Debtor Panel - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
} from '@mui/material';
import {
  AttachMoney,
  Schedule,
  Warning,
  CheckCircle,
  Close,
  Phone,
  Email,
  Assignment,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/redux';
import { updateClientStatus, setPromisePayment } from '../../store/slices/clientsSlice';
import { updateChatStatus } from '../../store/slices/chatsSlice';
import type { Client, Chat } from '../../types/index';
import {
  formatCurrency,
  formatDateOnly,
  getClientPriority,
  getPriorityColor,
  getCollectionStatusColor,
  getCollectionStatusLabel,
  daysUntil,
} from '../../utils/helpers';

interface DebtorPanelProps {
  client: Client;
  chat: Chat;
}

export default function DebtorPanel({ client, chat }: DebtorPanelProps) {
  const dispatch = useAppDispatch();
  const [promiseDialog, setPromiseDialog] = useState(false);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(client.debtAmount);

  const priority = getClientPriority(client);
  const priorityColor = getPriorityColor(priority);

  const handleUpdateStatus = async (status: string) => {
    await dispatch(updateClientStatus({ clientId: client.id, collectionStatus: status as any }));
  };

  const handleSavePromise = async () => {
    if (promiseDate && promiseAmount > 0) {
      await dispatch(setPromisePayment({
        clientId: client.id,
        promiseDate,
        promiseAmount,
      }));
      setPromiseDialog(false);
    }
  };

  const handleResolveChat = async () => {
    await dispatch(updateChatStatus({ chatId: chat.id, status: 'resolved' }));
  };

  const handleCloseChat = async () => {
    await dispatch(updateChatStatus({ chatId: chat.id, status: 'closed' }));
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información del Deudor
        </Typography>
        <Divider />
      </Box>

      {/* Prioridad */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: priorityColor }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Prioridad
          </Typography>
          <Chip
            label={priority}
            sx={{
              backgroundColor: priorityColor,
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
      </Paper>

      {/* Monto de deuda */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AttachMoney sx={{ color: '#f57c00', mr: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            Deuda Total
          </Typography>
        </Box>
        <Typography variant="h4" color="error" fontWeight="bold">
          {formatCurrency(client.debtAmount)}
        </Typography>
      </Paper>

      {/* Días de mora */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#ffebee' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Warning sx={{ color: '#d32f2f', mr: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            Días en Mora
          </Typography>
        </Box>
        <Typography variant="h4" color="error" fontWeight="bold">
          {client.daysOverdue} días
        </Typography>
      </Paper>

      {/* Estado de cobranza */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Estado
          </Typography>
          <Chip
            label={getCollectionStatusLabel(client.collectionStatus)}
            size="small"
            sx={{
              backgroundColor: getCollectionStatusColor(client.collectionStatus),
              color: 'white',
            }}
          />
        </Box>
        
        {/* Acciones de estado */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleUpdateStatus('contacted')}
            disabled={client.collectionStatus === 'contacted'}
          >
            Contactado
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => setPromiseDialog(true)}
          >
            Promesa
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => handleUpdateStatus('paid')}
          >
            Pagado
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleUpdateStatus('legal')}
          >
            Legal
          </Button>
        </Box>
      </Paper>

      {/* Promesa de pago */}
      {client.promisePaymentDate && (
        <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Schedule sx={{ color: '#1976d2', mr: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Promesa de Pago
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(client.promisePaymentAmount || 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fecha: {formatDateOnly(client.promisePaymentDate)}
          </Typography>
          {daysUntil(client.promisePaymentDate) < 0 ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              Promesa vencida hace {Math.abs(daysUntil(client.promisePaymentDate))} días
            </Alert>
          ) : (
            <Typography variant="caption" color="success.main">
              Faltan {daysUntil(client.promisePaymentDate)} días
            </Typography>
          )}
        </Paper>
      )}

      {/* Último pago */}
      {client.lastPaymentDate && (
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircle sx={{ color: '#4caf50', mr: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Último Pago
            </Typography>
          </Box>
          <Typography variant="body2">
            {formatDateOnly(client.lastPaymentDate)}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Información de contacto */}
      <Typography variant="subtitle2" gutterBottom>
        Contacto
      </Typography>
      <List dense>
        {client.phone && (
          <ListItem>
            <Phone sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            <ListItemText primary={client.phone} />
          </ListItem>
        )}
        {client.email && (
          <ListItem>
            <Email sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            <ListItemText primary={client.email} />
          </ListItem>
        )}
        {client.documentNumber && (
          <ListItem>
            <Assignment sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            <ListItemText
              primary={`${client.documentType || 'ID'}: ${client.documentNumber}`}
            />
          </ListItem>
        )}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Acciones del chat */}
      <Typography variant="subtitle2" gutterBottom>
        Acciones
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="success"
          fullWidth
          onClick={handleResolveChat}
          disabled={chat.status === 'resolved' || chat.status === 'closed'}
        >
          Marcar Resuelto
        </Button>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={handleCloseChat}
          disabled={chat.status === 'closed'}
        >
          Cerrar Chat
        </Button>
      </Box>

      {/* Dialog de promesa de pago */}
      <Dialog open={promiseDialog} onClose={() => setPromiseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registrar Promesa de Pago
          <IconButton
            onClick={() => setPromiseDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Fecha de Promesa"
            type="date"
            fullWidth
            value={promiseDate}
            onChange={(e) => setPromiseDate(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />
          <TextField
            label="Monto Prometido"
            type="number"
            fullWidth
            value={promiseAmount}
            onChange={(e) => setPromiseAmount(Number(e.target.value))}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromiseDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSavePromise}
            disabled={!promiseDate || promiseAmount <= 0}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
