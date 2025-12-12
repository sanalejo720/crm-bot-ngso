// Evidencias de Pago - Panel para Supervisores
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Download,
  Visibility,
  AttachMoney,
  EventNote,
  SwapHoriz,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface Evidence {
  id: string;
  ticketNumber: string;
  closureType: 'paid' | 'promise' | 'transfer';
  fileName: string;
  filePath: string;
  clientName: string;
  agentName: string;
  amount: number | null;
  promiseDate: string | null;
  createdAt: string;
}

export default function EvidencesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'promise' | 'transfer'>('all');

  useEffect(() => {
    fetchEvidences();
  }, []);

  const fetchEvidences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/evidences');
      
      // El backend tiene un TransformInterceptor que envuelve la respuesta:
      // response.data = { success, data: { success, data: [...], total }, timestamp }
      // Por eso necesitamos acceder a response.data.data.data
      const evidencesData = response.data?.data?.data || response.data?.data || [];
      const evidencesArray = Array.isArray(evidencesData) ? evidencesData : [];
      
      console.log('✅ Evidencias cargadas:', evidencesArray.length);
      setEvidences(evidencesArray);
    } catch (error: any) {
      console.error('❌ Error cargando evidencias:', error);
      setEvidences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = async (evidence: Evidence) => {
    try {
      setDownloading(true);
      setError('');

      // Descargar el archivo directamente sin contraseña
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/evidences/download/${evidence.ticketNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = evidence.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error descargando evidencia:', error);
      setError(error.message || 'Error al descargar el archivo. Verifica tu conexión.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (type: string) => {
    if (type === 'paid') return 'success';
    if (type === 'promise') return 'warning';
    return 'default';
  };

  const getStatusLabel = (type: string) => {
    if (type === 'paid') return 'Pago Realizado';
    if (type === 'promise') return 'Promesa de Pago';
    return 'Cierre Automático';
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Visibility /> PDFs de Cierre
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PDFs de cierres de negociación (pagos, promesas y transferencias) con código QR de verificación.
                  </Typography>
                </Box>

                <ToggleButtonGroup
                  value={filterType}
                  exclusive
                  onChange={(_, newValue) => newValue && setFilterType(newValue)}
                  size="small"
                >
                  <ToggleButton value="all">
                    Todos ({evidences.length})
                  </ToggleButton>
                  <ToggleButton value="paid">
                    <AttachMoney sx={{ mr: 0.5 }} fontSize="small" />
                    Pagos
                  </ToggleButton>
                  <ToggleButton value="promise">
                    <EventNote sx={{ mr: 0.5 }} fontSize="small" />
                    Promesas
                  </ToggleButton>
                  <ToggleButton value="transfer">
                    <SwapHoriz sx={{ mr: 0.5 }} fontSize="small" />
                    Automáticos
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {evidences.filter(e => filterType === 'all' || e.closureType === filterType).length === 0 ? (
                <Alert severity="info">
                  No hay evidencias registradas aún.
                </Alert>
              ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Ticket</strong></TableCell>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Asesor</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell align="right"><strong>Monto</strong></TableCell>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evidences
                .filter(e => filterType === 'all' || e.closureType === filterType)
                .map((evidence) => (
                <TableRow key={evidence.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {evidence.ticketNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{evidence.clientName}</TableCell>
                  <TableCell>{evidence.agentName}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(evidence.closureType)}
                      color={getStatusColor(evidence.closureType)}
                      size="small"
                      icon={
                        evidence.closureType === 'paid' ? <AttachMoney /> : 
                        evidence.closureType === 'promise' ? <EventNote /> : 
                        <SwapHoriz />
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {evidence.amount ? formatCurrency(evidence.amount) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(evidence.createdAt)}
                    </Typography>
                    {evidence.promiseDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Promesa: {formatDate(evidence.promiseDate)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Descargar PDF con QR de verificación">
                      <IconButton
                        color="primary"
                        onClick={() => handleDownloadClick(evidence)}
                        size="small"
                        disabled={downloading}
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
              )}

              {/* Mensaje de error si existe */}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
