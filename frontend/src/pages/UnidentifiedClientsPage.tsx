import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  ContactPhone as ContactedIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import { toast } from 'react-toastify';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface UnidentifiedClient {
  id: string;
  phone: string;
  name?: string;
  documentType?: string;
  documentNumber?: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'resolved' | 'transferred';
  chatId?: string;
  assignedToId?: string;
  assignedTo?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  pending?: number;
  contacted?: number;
  resolved?: number;
  transferred?: number;
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'warning', icon: <PendingIcon /> },
  contacted: { label: 'Contactado', color: 'info', icon: <ContactedIcon /> },
  resolved: { label: 'Resuelto', color: 'success', icon: <CheckCircleIcon /> },
  transferred: { label: 'Transferido', color: 'secondary', icon: <TransferIcon /> },
};

const UnidentifiedClientsPage: React.FC = () => {
  const { user, hasPermission } = usePermissions();
  const [sidebarOpen] = useState(true);
  const [clients, setClients] = useState<UnidentifiedClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<Stats>({});
  // @ts-ignore - Used in dialog actions
  const [selectedClient, setSelectedClient] = useState<UnidentifiedClient | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'edit' | 'assign' | 'status'>('edit');

  useEffect(() => {
    if (hasPermission('unidentified-clients', 'read')) {
      fetchClients();
      fetchStats();
    }
  }, [page, pageSize, statusFilter, searchTerm]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/unidentified-clients', { params });
      setClients(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      toast.error('Error al cargar clientes: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/unidentified-clients/stats');
      setStats(response.data || {});
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  // @ts-ignore - Used for future dialog implementation
  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      await api.patch(`/unidentified-clients/${id}/status`, { status, notes });
      toast.success('Estado actualizado correctamente');
      fetchClients();
      fetchStats();
      setOpenDialog(false);
    } catch (error: any) {
      toast.error('Error al actualizar estado: ' + (error.response?.data?.message || error.message));
    }
  };

  // @ts-ignore - Used for future dialog implementation
  const handleAssign = async (id: string, userId: string) => {
    try {
      await api.patch(`/unidentified-clients/${id}/assign`, { userId });
      toast.success('Cliente asignado correctamente');
      fetchClients();
      setOpenDialog(false);
    } catch (error: any) {
      toast.error('Error al asignar cliente: ' + (error.response?.data?.message || error.message));
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'phone',
      headerName: 'Teléfono',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PhoneIcon fontSize="small" color="action" />
          {params.value}
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: 'Nombre',
      width: 180,
      valueGetter: (params: any) => params.row.name || 'Sin nombre',
    },
    {
      field: 'documentNumber',
      headerName: 'Documento',
      width: 130,
      valueGetter: (params: any) => params.row.documentNumber || '-',
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const config = statusConfig[params.value as keyof typeof statusConfig];
        return (
          <Chip
            label={config.label}
            color={config.color as any}
            size="small"
            icon={config.icon}
          />
        );
      },
    },
    {
      field: 'assignedTo',
      headerName: 'Asignado a',
      width: 180,
      valueGetter: (params: any) => params.row.assignedTo?.name || 'Sin asignar',
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 160,
      valueGetter: (params: any) => new Date(params.row.createdAt).toLocaleString('es-CO'),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          {hasPermission('unidentified-clients', 'update') && (
            <>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedClient(params.row);
                  setDialogType('status');
                  setOpenDialog(true);
                }}
                title="Cambiar estado"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedClient(params.row);
                  setDialogType('assign');
                  setOpenDialog(true);
                }}
                title="Asignar"
              >
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ];

  if (!hasPermission('unidentified-clients', 'read')) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <ModernSidebar open={sidebarOpen} />
        <Box sx={{ flexGrow: 1 }}>
          <AppHeader />
          <Box p={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom color="error">
                ⛔ No tienes permisos para ver esta sección
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Necesitas el permiso: <strong>unidentified_clients:read</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                Tu rol actual: <strong>{user?.role?.name || 'Desconocido'}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                Por favor contacta al administrador del sistema.
              </Typography>
              {user?.role?.permissions && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tus permisos actuales: {user.role.permissions.length}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => console.log('Permisos:', user.role.permissions.map((p: any) => p.name))}
                    sx={{ mt: 1 }}
                  >
                    Ver en consola
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ModernSidebar open={sidebarOpen} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <Box p={3} sx={{ flexGrow: 1, overflow: 'auto' }}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Clientes No Identificados
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestiona clientes que contactaron pero no están en la base de deudores
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4">{stats[key as keyof Stats] || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.label}
                    </Typography>
                  </Box>
                  <Box color={`${config.color}.main`}>{config.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </div>
        ))}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1.5fr 2.5fr' }, gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar"
            placeholder="Teléfono, nombre o documento"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <TextField
            fullWidth
            select
            size="small"
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                {config.label}
              </MenuItem>
            ))}
          </TextField>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setStatusFilter('');
                setSearchTerm('');
              }}
            >
              Limpiar Filtros
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Data Grid */}
      <Paper>
        <DataGrid
          rows={clients}
          columns={columns}
          paginationMode="server"
          rowCount={total}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50]}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Dialog for status/assign */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'status' ? 'Cambiar Estado' : 'Asignar Cliente'}
        </DialogTitle>
        <DialogContent>
          {/* Dialog content would go here */}
          <Typography>Funcionalidad de diálogo en desarrollo</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default UnidentifiedClientsPage;
