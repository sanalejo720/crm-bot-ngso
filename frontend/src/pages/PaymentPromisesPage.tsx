// Payment Promises Page - NGS&O CRM Gestión
// Gestión y seguimiento de promesas de pago
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface PaymentPromise {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  promiseAmount: number;
  promiseDate: string;
  debtAmount: number;
  daysUntilDue: number;
  chatId?: string;
  whatsappNumberId?: string;
  status: 'upcoming' | 'due-today' | 'overdue';
}

export default function PaymentPromisesPage() {
  const [sidebarOpen] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [upcomingPromises, setUpcomingPromises] = useState<PaymentPromise[]>([]);
  const [todayPromises, setTodayPromises] = useState<PaymentPromise[]>([]);
  const [overduePromises, setOverduePromises] = useState<PaymentPromise[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para diálogo de marcar como pagado
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedPromise, setSelectedPromise] = useState<PaymentPromise | null>(null);
  const [actualPaymentAmount, setActualPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    setLoading(true);
    try {
      const [upcomingRes, todayRes, overdueRes] = await Promise.all([
        api.get('/payment-promises/upcoming?days=7'),
        api.get('/payment-promises/due-today'),
        api.get('/payment-promises/overdue'),
      ]);

      // Corregir acceso a datos con TransformInterceptor
      setUpcomingPromises(upcomingRes.data?.data?.data || upcomingRes.data?.data || []);
      setTodayPromises(todayRes.data?.data?.data || todayRes.data?.data || []);
      setOverduePromises(overdueRes.data?.data?.data || overdueRes.data?.data || []);
    } catch (error) {
      console.error('Error cargando promesas:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar promesas de pago',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (promise: PaymentPromise, reminderType: string) => {
    try {
      setProcessing(true);
      const response = await api.post(
        `/payment-promises/${promise.clientId}/send-reminder`,
        { reminderType }
      );

      if (response.data?.data?.success || response.data?.success) {
        setSnackbar({
          open: true,
          message: `✅ Recordatorio enviado a ${promise.clientName}`,
          severity: 'success',
        });
      } else {
        throw new Error('No se pudo enviar el recordatorio');
      }
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      setSnackbar({
        open: true,
        message: 'Error al enviar recordatorio',
        severity: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenMarkPaid = (promise: PaymentPromise) => {
    setSelectedPromise(promise);
    setActualPaymentAmount(promise.promiseAmount.toString());
    setMarkPaidDialogOpen(true);
  };

  const handleCloseMarkPaid = () => {
    setMarkPaidDialogOpen(false);
    setSelectedPromise(null);
    setActualPaymentAmount('');
  };

  const handleConfirmMarkPaid = async () => {
    if (!selectedPromise) return;

    try {
      setProcessing(true);
      await api.patch(`/payment-promises/${selectedPromise.clientId}/mark-paid`, {
        actualPaymentAmount: parseFloat(actualPaymentAmount),
      });

      setSnackbar({
        open: true,
        message: `✅ ${selectedPromise.clientName} marcado como pagado`,
        severity: 'success',
      });

      handleCloseMarkPaid();
      loadPromises(); // Recargar lista
    } catch (error) {
      console.error('Error marcando como pagado:', error);
      setSnackbar({
        open: true,
        message: 'Error al marcar como pagado',
        severity: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusChip = (promise: PaymentPromise) => {
    const { daysUntilDue, status } = promise;

    if (status === 'overdue') {
      return (
        <Chip
          icon={<WarningIcon />}
          label={`Vencida (${Math.abs(daysUntilDue)} días)`}
          color="error"
          size="small"
        />
      );
    }

    if (status === 'due-today') {
      return (
        <Chip
          icon={<EventIcon />}
          label="Vence HOY"
          color="warning"
          size="small"
        />
      );
    }

    return (
      <Chip
        icon={<ScheduleIcon />}
        label={`${daysUntilDue} días`}
        color="info"
        size="small"
      />
    );
  };

  const renderPromisesTable = (promises: PaymentPromise[]) => {
    if (promises.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>No hay promesas en esta categoría</Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Teléfono</strong></TableCell>
              <TableCell align="right"><strong>Monto Prometido</strong></TableCell>
              <TableCell><strong>Fecha Promesa</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promises.map((promise) => (
              <TableRow key={promise.id} hover>
                <TableCell>{promise.clientName}</TableCell>
                <TableCell>{promise.phone}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold" color="primary">
                    {formatCurrency(promise.promiseAmount)}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(promise.promiseDate)}</TableCell>
                <TableCell>{getStatusChip(promise)}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Enviar recordatorio por WhatsApp">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleSendReminder(promise, promise.status)}
                        disabled={processing}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Marcar como pagado">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenMarkPaid(promise)}
                        disabled={processing}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <ModernSidebar open={sidebarOpen} />
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ModernSidebar open={sidebarOpen} />
      <Box sx={{ flexGrow: 1 }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              📅 Gestión de Promesas de Pago
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadPromises}
            >
              Actualizar
            </Button>
          </Box>

          {/* Resumen de estadísticas */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Vencen HOY
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {todayPromises.length}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Próximas (7 días)
                </Typography>
                <Typography variant="h4" color="info.main">
                  {upcomingPromises.length}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  VENCIDAS
                </Typography>
                <Typography variant="h4" color="error.main">
                  {overduePromises.length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Tabs con promesas */}
          <Card>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label={`Vencen HOY (${todayPromises.length})`} />
              <Tab label={`Próximas (${upcomingPromises.length})`} />
              <Tab label={`Vencidas (${overduePromises.length})`} />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {tabValue === 0 && renderPromisesTable(todayPromises)}
              {tabValue === 1 && renderPromisesTable(upcomingPromises)}
              {tabValue === 2 && renderPromisesTable(overduePromises)}
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Diálogo para marcar como pagado */}
      <Dialog open={markPaidDialogOpen} onClose={handleCloseMarkPaid} maxWidth="sm" fullWidth>
        <DialogTitle>✅ Marcar Promesa como Pagada</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedPromise && (
                <>
                  <strong>{selectedPromise.clientName}</strong> pasará a estado "Pagado"
                  y se agregará al total recuperado.
                </>
              )}
            </Alert>

            <TextField
              fullWidth
              label="Monto Real del Pago"
              type="number"
              value={actualPaymentAmount}
              onChange={(e) => setActualPaymentAmount(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              helperText="Ingresa el monto real que pagó el cliente"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMarkPaid} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmMarkPaid}
            variant="contained"
            color="success"
            disabled={processing || !actualPaymentAmount}
            startIcon={processing ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {processing ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
