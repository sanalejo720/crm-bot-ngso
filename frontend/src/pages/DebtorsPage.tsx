// Debtors Management Page - NGS&O CRM Gestión
// Gestión completa de base de datos de deudores

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import { UploadDebtorsDialog } from '../components/UploadDebtorsDialog';
import api from '../services/api';
import { toast } from 'react-toastify';

interface Debtor {
  id: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone?: string;
  email?: string;
  debtAmount: number;
  initialDebtAmount: number;
  daysOverdue: number;
  status: string;
  lastContactedAt?: string;
  metadata?: {
    compania?: string;
    producto?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  totalDebt: number;
  averageDaysOverdue: number;
  byStatus: Record<string, number>;
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalDebt: 0,
    averageDaysOverdue: 0,
    byStatus: {},
  });

  useEffect(() => {
    loadDebtors();
  }, [page, rowsPerPage]);

  const loadDebtors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/debtors', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });

      console.log('Debtors API Response:', response.data);

      // Backend tiene interceptor global que envuelve en { success, data, timestamp }
      // Entonces la estructura es: response.data.data.data
      const responseData = response.data.data || response.data; // Fallback por si cambia
      const debtorsArray = responseData.data || [];
      const metadata = responseData.meta || {};

      console.log('Debtors Array:', debtorsArray);
      console.log('Metadata:', metadata);

      setDebtors(debtorsArray);
      setTotal(metadata.total || debtorsArray.length);
      
      // Calcular estadísticas
      calculateStats(debtorsArray);
    } catch (error) {
      console.error('Error loading debtors:', error);
      toast.error('Error al cargar deudores');
      setDebtors([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Debtor[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      setStats({
        total: 0,
        totalDebt: 0,
        averageDaysOverdue: 0,
        byStatus: {},
      });
      return;
    }

    const totalDebt = data.reduce((sum, d) => sum + Number(d.debtAmount || 0), 0);
    const totalDays = data.reduce((sum, d) => sum + Number(d.daysOverdue || 0), 0);
    const byStatus: Record<string, number> = {};

    data.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });

    setStats({
      total: data.length,
      totalDebt,
      averageDaysOverdue: data.length > 0 ? Math.round(totalDays / data.length) : 0,
      byStatus,
    });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredDebtors = Array.isArray(debtors) 
    ? debtors.filter(debtor =>
        debtor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debtor.documentNumber?.includes(searchTerm) ||
        debtor.phone?.includes(searchTerm)
      )
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'negotiating': return 'info';
      case 'paid': return 'default';
      case 'defaulted': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'negotiating': return 'Negociando';
      case 'paid': return 'Pagado';
      case 'defaulted': return 'Moroso';
      default: return status;
    }
  };

  const [sidebarOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748', mb: 1 }}>
                Base de Datos de Deudores
              </Typography>
              <Typography variant="body1" sx={{ color: '#718096' }}>
                Gestiona la cartera de clientes y carga masiva de datos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Recargar datos">
                <IconButton
                  onClick={loadDebtors}
                  sx={{
                    bgcolor: 'white',
                    boxShadow: 1,
                    '&:hover': { bgcolor: '#f7fafc' },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => setOpenUploadDialog(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  px: 3,
                  boxShadow: 2,
                }}
              >
                Cargar Base de Datos
              </Button>
            </Box>
          </Box>

          {/* Info Alert */}
          <Alert severity="info" sx={{ mb: 3 }}>
            Carga archivos CSV o Excel con la información de deudores. El sistema detectará automáticamente duplicados y actualizará los registros existentes.
          </Alert>

          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                    }}
                  >
                    <PersonIcon />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Deudores
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'success.light',
                      color: 'success.main',
                    }}
                  >
                    <MoneyIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatCurrency(stats.totalDebt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deuda Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'warning.light',
                      color: 'warning.main',
                    }}
                  >
                    <CalendarIcon />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.averageDaysOverdue}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Días Mora Promedio
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'info.light',
                      color: 'info.main',
                    }}
                  >
                    <PhoneIcon />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {Array.isArray(debtors) ? debtors.filter(d => d.phone).length : 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Con Teléfono
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Search */}
          <Card sx={{ mb: 3, boxShadow: 2 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, documento o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          {/* Table */}
          <Card sx={{ boxShadow: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell><strong>Documento</strong></TableCell>
                    <TableCell><strong>Teléfono</strong></TableCell>
                    <TableCell><strong>Compañía</strong></TableCell>
                    <TableCell align="right"><strong>Deuda</strong></TableCell>
                    <TableCell align="center"><strong>Mora (días)</strong></TableCell>
                    <TableCell align="center"><strong>Estado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredDebtors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron deudores
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDebtors.map((debtor) => (
                      <TableRow key={debtor.id} hover>
                        <TableCell>{debtor.fullName}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {debtor.documentType} {debtor.documentNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {debtor.phone || '-'}
                        </TableCell>
                        <TableCell>
                          {debtor.metadata?.compania || '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                            {formatCurrency(debtor.debtAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={debtor.daysOverdue}
                            size="small"
                            color={debtor.daysOverdue > 60 ? 'error' : debtor.daysOverdue > 30 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getStatusLabel(debtor.status)}
                            size="small"
                            color={getStatusColor(debtor.status) as any}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Card>

          {/* Upload Dialog */}
          <UploadDebtorsDialog
            open={openUploadDialog}
            onClose={() => setOpenUploadDialog(false)}
            onSuccess={() => {
              loadDebtors();
              toast.success('Base de datos actualizada correctamente');
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
