// WhatsApp Management Page - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  QrCode as QrCodeIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  provider: 'wppconnect' | 'meta';
  status: 'connected' | 'disconnected' | 'qr_waiting' | 'error' | 'pending_verification';
  campaignId?: string;
  campaign?: { id: string; name: string };
  lastError?: string;
  isActive: boolean;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
}

const WhatsAppManagement: React.FC = () => {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openQRDialog, setOpenQRDialog] = useState(false);
  const [openMetaDialog, setOpenMetaDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    phoneNumber: '',
    displayName: '',
    provider: 'wppconnect' as 'wppconnect' | 'meta',
    campaignId: '',
  });

  const [metaConfig, setMetaConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
  });

  useEffect(() => {
    loadNumbers();
    loadCampaigns();
    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const connectSocket = () => {
    const token = localStorage.getItem('accessToken');
    console.log('🔌 Conectando Socket.IO para WhatsApp Management...');
    console.log('🔑 Token length:', token?.length);
    
    if (!token) {
      console.error('❌ No hay token de autenticación disponible');
      return;
    }
    
    const newSocket = io('http://localhost:3000/events', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket conectado para WhatsApp Management (ID:', newSocket.id, ')');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      console.error('❌ Detalle:', error.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket desconectado:', reason);
    });

    newSocket.on('whatsapp.qrcode.generated', (data: { numberId: string; qrCode: string }) => {
      console.log('📱 QR Code recibido:', {
        numberId: data.numberId,
        qrLength: data.qrCode?.length,
        selectedId: selectedNumber?.id,
      });
      
      // Actualizar QR sin importar si coincide el número (para debug)
      setQrCode(data.qrCode);
    });

    newSocket.on('whatsapp.session.status', (data: { sessionName: string; status: string }) => {
      console.log('📊 Estado de sesión actualizado:', data);
    });

    newSocket.on('whatsapp.session.connected', (data: { numberId: string; sessionName: string }) => {
      console.log('✅ WhatsApp conectado exitosamente:', data);
      setOpenQRDialog(false);
      setQrCode('');
      loadNumbers();
      alert('¡WhatsApp conectado exitosamente!');
    });

    newSocket.on('whatsapp.session.disconnected', (data: { numberId: string }) => {
      console.log('⚠️ WhatsApp desconectado:', data);
      loadNumbers();
    });

    setSocket(newSocket);
  };

  const loadNumbers = async () => {
    try {
      const response = await api.get('/whatsapp-numbers');
      setNumbers(response.data.data || response.data);
    } catch (error) {
      console.error('Error al cargar números:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.data || response.data);
    } catch (error) {
      console.error('Error al cargar campañas:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/whatsapp-numbers', formData);
      setOpenAddDialog(false);
      setFormData({
        phoneNumber: '',
        displayName: '',
        provider: 'wppconnect',
        campaignId: '',
      });
      loadNumbers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al crear número');
    }
  };

  const handleStartWppConnect = async (number: WhatsAppNumber) => {
    try {
      setSelectedNumber(number);
      setQrCode('');
      setOpenQRDialog(true);

      const response = await api.post(`/whatsapp-numbers/${number.id}/wppconnect/start`);
      
      if (response.data.data?.qrCode) {
        setQrCode(response.data.data.qrCode);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al generar QR');
      setOpenQRDialog(false);
    }
  };

  const handleConfigureMeta = async () => {
    if (!selectedNumber) return;

    try {
      await api.post(`/whatsapp-numbers/${selectedNumber.id}/meta/configure`, metaConfig);
      setOpenMetaDialog(false);
      setMetaConfig({
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: '',
      });
      loadNumbers();
      alert('Meta Cloud API configurado exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al configurar Meta API');
    }
  };

  const handleOpenMetaDialog = (number: WhatsAppNumber) => {
    setSelectedNumber(number);
    setOpenMetaDialog(true);
  };

  const handleDisconnect = async (numberId: string) => {
    if (!confirm('¿Desconectar este número de WhatsApp?')) return;

    try {
      await api.post(`/whatsapp-numbers/${numberId}/wppconnect/disconnect`);
      loadNumbers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al desconectar');
    }
  };

  const handleDelete = async (numberId: string) => {
    if (!confirm('¿Eliminar este número? Esta acción no se puede deshacer.')) return;

    try {
      await api.delete(`/whatsapp-numbers/${numberId}`);
      loadNumbers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleAssignCampaign = async (numberId: string, campaignId: string) => {
    try {
      await api.patch(`/whatsapp-numbers/${numberId}/campaign/${campaignId}`);
      loadNumbers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al asignar campaña');
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any; icon: any }> = {
      connected: { label: 'Conectado', color: 'success', icon: <CheckCircleIcon /> },
      disconnected: { label: 'Desconectado', color: 'default', icon: null },
      qr_waiting: { label: 'Esperando QR', color: 'warning', icon: <QrCodeIcon /> },
      error: { label: 'Error', color: 'error', icon: <ErrorIcon /> },
      pending_verification: { label: 'Pendiente', color: 'info', icon: null },
    };

    const config = statusConfig[status] || statusConfig.disconnected;
    return <Chip label={config.label} color={config.color} icon={config.icon} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <ModernSidebar />
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
          <AppHeader />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          <PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Números WhatsApp
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadNumbers}
            sx={{ mr: 2 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            Agregar Número
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Campaña</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {numbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">
                        No hay números configurados. Agrega uno para comenzar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  numbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell>
                        <Typography fontWeight="medium">{number.displayName}</Typography>
                      </TableCell>
                      <TableCell>{number.phoneNumber}</TableCell>
                      <TableCell>
                        <Chip
                          label={number.provider === 'wppconnect' ? 'WPPConnect' : 'Meta Cloud'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{getStatusChip(number.status)}</TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={number.campaignId || ''}
                          onChange={(e) => handleAssignCampaign(number.id, e.target.value)}
                          sx={{ minWidth: 150 }}
                        >
                          <MenuItem value="">Sin asignar</MenuItem>
                          {campaigns.map((campaign) => (
                            <MenuItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="right">
                        {number.provider === 'wppconnect' ? (
                          <>
                            {number.status !== 'connected' ? (
                              <Tooltip title="Conectar con QR">
                                <IconButton
                                  color="primary"
                                  onClick={() => handleStartWppConnect(number)}
                                >
                                  <QrCodeIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Desconectar">
                                <IconButton
                                  color="error"
                                  onClick={() => handleDisconnect(number.id)}
                                >
                                  <ErrorIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <Tooltip title="Configurar Meta API">
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenMetaDialog(number)}
                            >
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar">
                          <IconButton color="error" onClick={() => handleDelete(number.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog: Agregar Número */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Número WhatsApp</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre Descriptivo"
              fullWidth
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Ej: Línea Principal"
            />
            <TextField
              label="Número de Teléfono"
              fullWidth
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="Ej: 573001234567"
              helperText="Incluye código de país sin +"
            />
            <TextField
              select
              label="Proveedor"
              fullWidth
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value as 'wppconnect' | 'meta' })
              }
            >
              <MenuItem value="wppconnect">WPPConnect (QR Local)</MenuItem>
              <MenuItem value="meta">Meta Cloud API</MenuItem>
            </TextField>
            <TextField
              select
              label="Campaña (Opcional)"
              fullWidth
              value={formData.campaignId}
              onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
            >
              <MenuItem value="">Sin asignar</MenuItem>
              {campaigns.map((campaign) => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Escanear QR WPPConnect */}
      <Dialog open={openQRDialog} onClose={() => setOpenQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Conectar WhatsApp - {selectedNumber?.displayName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, textAlign: 'center' }}>
            {!qrCode ? (
              <Box>
                <CircularProgress />
                <Typography mt={2}>Generando código QR...</Typography>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  1. Abre WhatsApp en tu teléfono
                  <br />
                  2. Ve a Configuración {'>'} Dispositivos vinculados
                  <br />
                  3. Toca "Vincular un dispositivo"
                  <br />
                  4. Escanea este código QR
                </Alert>
                <img
                  src={qrCode}
                  alt="QR Code"
                  style={{ width: '100%', maxWidth: 300, border: '2px solid #ddd', borderRadius: 8 }}
                />
                <Typography mt={2} color="textSecondary">
                  El QR expira en 30 segundos
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Configurar Meta Cloud API */}
      <Dialog open={openMetaDialog} onClose={() => setOpenMetaDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configurar Meta Cloud API - {selectedNumber?.displayName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Pasos para obtener credenciales:
              </Typography>
              <Typography variant="body2" component="div">
                1. Ve a{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener">
                  Facebook Developers
                </a>
                <br />
                2. Crea una App con producto "WhatsApp"
                <br />
                3. En WhatsApp {'>'} Configuración, copia:
                <br />
                &nbsp;&nbsp;• Token de Acceso Temporal (o genera uno permanente)
                <br />
                &nbsp;&nbsp;• ID del Número de Teléfono
                <br />
                &nbsp;&nbsp;• ID de la Cuenta de WhatsApp Business
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Access Token"
                fullWidth
                value={metaConfig.accessToken}
                onChange={(e) => setMetaConfig({ ...metaConfig, accessToken: e.target.value })}
                placeholder="EAAxxxxx..."
                helperText="Token de acceso de tu App de Facebook"
              />
              <TextField
                label="Phone Number ID"
                fullWidth
                value={metaConfig.phoneNumberId}
                onChange={(e) => setMetaConfig({ ...metaConfig, phoneNumberId: e.target.value })}
                placeholder="123456789012345"
                helperText="ID del número de teléfono en WhatsApp Business"
              />
              <TextField
                label="Business Account ID"
                fullWidth
                value={metaConfig.businessAccountId}
                onChange={(e) => setMetaConfig({ ...metaConfig, businessAccountId: e.target.value })}
                placeholder="123456789012345"
                helperText="ID de tu cuenta de WhatsApp Business"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMetaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfigureMeta}>
            Guardar y Verificar
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default WhatsAppManagement;
