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
  Snackbar,
  CircularProgress,
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
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/redux';
import { updateClientStatus, setPromisePayment, updateClientData } from '../../store/slices/clientsSlice';
import { updateChatStatus } from '../../store/slices/chatsSlice';
import type { Client, Chat } from '../../types/index';
import ExportChatSection from './ExportChatSection';
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
  client: Client | null;
  chat: Chat;
}

export default function DebtorPanel({ client, chat }: DebtorPanelProps) {
  const dispatch = useAppDispatch();
  
  // Obtener datos de deuda desde campos directos
  const debtAmount = client?.debtAmount || 0;
  const daysOverdue = client?.daysOverdue || 0;
  
  const [promiseDialog, setPromiseDialog] = useState(false);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(debtAmount);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Estado para edición del cliente
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    fullName: client?.fullName || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    documentType: client?.documentType || 'CC',
    documentNumber: client?.documentNumber || '',
    debtAmount: client?.debtAmount || 0,
    daysOverdue: client?.daysOverdue || 0,
  });

  // Si no hay cliente, mostrar mensaje
  if (!client) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info">
          Este chat no tiene un cliente asociado.
        </Alert>
      </Box>
    );
  }

  // Usar los valores calculados para prioridad
  const clientWithDebt = { ...client, debtAmount, daysOverdue };
  const priority = getClientPriority(clientWithDebt);
  const priorityColor = getPriorityColor(priority);

  const handleOpenEditDialog = () => {
    setEditData({
      fullName: client.fullName || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      documentType: client.documentType || 'CC',
      documentNumber: client.documentNumber || '',
      debtAmount: client.debtAmount || 0,
      daysOverdue: client.daysOverdue || 0,
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsUpdating(true);
      await dispatch(updateClientData({ clientId: client.id, data: editData })).unwrap();
      setEditDialog(false);
      setSnackbar({
        open: true,
        message: 'Información del deudor actualizada',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al actualizar información',
        severity: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      setIsUpdating(true);
      await dispatch(updateClientStatus({ clientId: client.id, collectionStatus: status as any })).unwrap();
      
      setSnackbar({
        open: true,
        message: `Estado actualizado a: ${getCollectionStatusLabel(status as any)}`,
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al actualizar el estado',
        severity: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePromise = async () => {
    if (promiseDate && promiseAmount > 0) {
      try {
        setIsUpdating(true);
        await dispatch(setPromisePayment({
          clientId: client.id,
          promiseDate,
          promiseAmount,
        })).unwrap();
        
        setPromiseDialog(false);
        setSnackbar({
          open: true,
          message: 'Promesa de pago registrada exitosamente',
          severity: 'success',
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || 'Error al registrar la promesa',
          severity: 'error',
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleResolveChat = async () => {
    try {
      setIsUpdating(true);
      await dispatch(updateChatStatus({ chatId: chat.id, status: 'resolved' })).unwrap();
      setSnackbar({
        open: true,
        message: 'Chat marcado como resuelto',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al resolver el chat',
        severity: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseChat = async () => {
    try {
      setIsUpdating(true);
      await dispatch(updateChatStatus({ chatId: chat.id, status: 'closed' })).unwrap();
      setSnackbar({
        open: true,
        message: 'Chat cerrado exitosamente',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al cerrar el chat',
        severity: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Información del Deudor
        </Typography>
        <IconButton 
          onClick={handleOpenEditDialog} 
          size="small" 
          color="primary"
          title="Editar información"
        >
          <EditIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />

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
          {formatCurrency(debtAmount)}
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
          {daysOverdue} días
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
            disabled={client.collectionStatus === 'contacted' || isUpdating}
            startIcon={isUpdating ? <CircularProgress size={14} /> : null}
          >
            Contactado
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => setPromiseDialog(true)}
            disabled={isUpdating}
          >
            Promesa
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => handleUpdateStatus('paid')}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={14} /> : null}
          >
            Pagado
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleUpdateStatus('legal')}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={14} /> : null}
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

      {/* Exportar Chat - Solo visible si hay promesa o pago */}
      {(client.collectionStatus === 'promise' || client.collectionStatus === 'paid') && (
        <ExportChatSection 
          chatId={chat.id} 
          clientName={client.fullName}
          collectionStatus={client.collectionStatus}
        />
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
          disabled={chat.status === 'resolved' || chat.status === 'closed' || isUpdating}
          startIcon={isUpdating ? <CircularProgress size={16} /> : null}
        >
          {isUpdating ? 'Procesando...' : 'Marcar Resuelto'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={handleCloseChat}
          disabled={chat.status === 'closed' || isUpdating}
          startIcon={isUpdating ? <CircularProgress size={16} /> : null}
        >
          {isUpdating ? 'Cerrando...' : 'Cerrar Chat'}
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
          <Button onClick={() => setPromiseDialog(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePromise}
            disabled={!promiseDate || promiseAmount <= 0 || isUpdating}
            startIcon={isUpdating ? <CircularProgress size={16} /> : null}
          >
            {isUpdating ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edición de cliente */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Información del Deudor
          <IconButton
            onClick={() => setEditDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre Completo"
              fullWidth
              value={editData.fullName}
              onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tipo Documento"
                fullWidth
                value={editData.documentType}
                onChange={(e) => setEditData({ ...editData, documentType: e.target.value })}
              />
              <TextField
                label="Número Documento"
                fullWidth
                value={editData.documentNumber}
                onChange={(e) => setEditData({ ...editData, documentNumber: e.target.value })}
              />
            </Box>
            <TextField
              label="Teléfono"
              fullWidth
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            />
            <TextField
              label="Dirección"
              fullWidth
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Monto Deuda"
                fullWidth
                type="number"
                value={editData.debtAmount}
                onChange={(e) => setEditData({ ...editData, debtAmount: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
              <TextField
                label="Días en Mora"
                fullWidth
                type="number"
                value={editData.daysOverdue}
                onChange={(e) => setEditData({ ...editData, daysOverdue: Number(e.target.value) })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={16} /> : null}
          >
            {isUpdating ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
