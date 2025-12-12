import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  MenuItem,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Visibility as ViewIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { botFlowsService } from '../services/botFlowsService';
import type { BotFlow, CreateBotFlowDto } from '../services/botFlowsService';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

export default function BotFlowsPage() {
  const navigate = useNavigate();
  const [sidebarOpen] = useState(true);
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<CreateBotFlowDto>({
    name: '',
    description: '',
    status: 'draft',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const response = await botFlowsService.getFlows();
      setFlows(response.data.data);
    } catch (error) {
      console.error('Error cargando flujos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', status: 'draft' });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await botFlowsService.updateFlow(editingId, formData);
      } else {
        await botFlowsService.createFlow(formData);
      }
      setOpenDialog(false);
      loadFlows();
    } catch (error) {
      console.error('Error guardando flujo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este flujo?')) {
      try {
        await botFlowsService.deleteFlow(id);
        loadFlows();
      } catch (error) {
        console.error('Error eliminando flujo:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await botFlowsService.duplicateFlow(id);
      loadFlows();
    } catch (error) {
      console.error('Error duplicando flujo:', error);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await botFlowsService.publishFlow(id);
      loadFlows();
    } catch (error) {
      console.error('Error publicando flujo:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'draft':
        return 'Borrador';
      case 'inactive':
        return 'Inactivo';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <ModernSidebar open={sidebarOpen} />
        <Box sx={{ flexGrow: 1 }}>
          <AppHeader />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
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
        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">🤖 Flujos de Bot</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Crear Flujo
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Nodos</strong></TableCell>
              <TableCell><strong>Última Modificación</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary" py={4}>
                    No hay flujos creados. Crea tu primer flujo para comenzar.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              flows.map((flow) => (
                <TableRow key={flow.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {flow.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {flow.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(flow.status)}
                      color={getStatusColor(flow.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {flow.nodes?.length || 0} nodos
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(flow.updatedAt).toLocaleDateString('es-CO')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/bot-flows/${flow.id}/editor`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/bot-flows/${flow.id}`)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {flow.status === 'draft' && (
                      <Tooltip title="Publicar">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handlePublish(flow.id)}
                        >
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Duplicar">
                      <IconButton
                        size="small"
                        onClick={() => handleDuplicate(flow.id)}
                      >
                        <DuplicateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(flow.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para Crear/Editar */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Editar Flujo' : 'Crear Nuevo Flujo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nombre del Flujo"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Estado"
              fullWidth
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <MenuItem value="draft">Borrador</MenuItem>
              <MenuItem value="active">Activo</MenuItem>
              <MenuItem value="inactive">Inactivo</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            {editingId ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
