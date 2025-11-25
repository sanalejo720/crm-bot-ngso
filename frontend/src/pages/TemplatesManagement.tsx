// Quick Replies Management - NGS&O CRM Gestión
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
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  TrendingUp as StatsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  variables: string[];
  category: string;
  usageCount: number;
  isActive: boolean;
  campaignId?: string;
  campaign?: { id: string; name: string };
}

interface Campaign {
  id: string;
  name: string;
}

interface Stats {
  totalTemplates: number;
  totalUsage: number;
  topTemplates: Array<{
    id: string;
    title: string;
    shortcut: string;
    usageCount: number;
  }>;
  byCategory: Record<string, number>;
}

const TemplatesManagement: React.FC = () => {
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStatsDialog, setOpenStatsDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReply | null>(null);

  const [formData, setFormData] = useState({
    shortcut: '',
    title: '',
    content: '',
    category: '',
    campaignId: '',
  });

  const categories = ['Saludo', 'Recordatorio', 'Seguimiento', 'Cierre', 'Informativo', 'Otro'];

  useEffect(() => {
    loadTemplates();
    loadCampaigns();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/quick-replies');
      setTemplates(response.data.data || response.data);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
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

  const loadStats = async () => {
    try {
      const response = await api.get('/quick-replies/stats');
      setStats(response.data.data || response.data);
      setOpenStatsDialog(true);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleOpenDialog = (template?: QuickReply) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        shortcut: template.shortcut,
        title: template.title,
        content: template.content,
        category: template.category || '',
        campaignId: template.campaignId || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        shortcut: '',
        title: '',
        content: '',
        category: '',
        campaignId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await api.patch(`/quick-replies/${editingTemplate.id}`, formData);
      } else {
        await api.post('/quick-replies', formData);
      }
      setOpenDialog(false);
      loadTemplates();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar plantilla');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;

    try {
      await api.delete(`/quick-replies/${id}`);
      loadTemplates();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleCopyShortcut = (shortcut: string) => {
    navigator.clipboard.writeText(shortcut);
    alert(`Shortcut copiado: ${shortcut}`);
  };

  const extractVariables = (content: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, (m) => m[1]);
  };

  useEffect(() => {
    const variables = extractVariables(formData.content);
    console.log('Variables detectadas:', variables);
  }, [formData.content]);

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
          Plantillas de Mensajes
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<StatsIcon />}
            onClick={loadStats}
            sx={{ mr: 2 }}
          >
            Estadísticas
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTemplates}
            sx={{ mr: 2 }}
          >
            Actualizar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Crear Plantilla
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Variables disponibles:</strong> {'{{'}clientName{'}}'},  {'{{'}debtAmount{'}}'},
          {'{{'}daysOverdue{'}}'},  {'{{'}agentName{'}}'},  {'{{'}campaignName{'}}'}
          <br />
          <strong>Uso:</strong> Escribe el shortcut (ej: /saludo) en el chat para usar la plantilla
        </Typography>
      </Alert>

      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Shortcut</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Contenido</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Campaña</TableCell>
                  <TableCell align="center">Usos</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">
                        No hay plantillas. Crea una para comenzar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Chip label={template.shortcut} size="small" color="primary" />
                        <Tooltip title="Copiar">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyShortcut(template.shortcut)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{template.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {template.content}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {template.category ? (
                          <Chip label={template.category} size="small" variant="outlined" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {template.campaign?.name || (
                          <Chip label="Global" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={template.usageCount} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(template.id)}
                          >
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

      {/* Dialog: Crear/Editar Plantilla */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Editar Plantilla' : 'Crear Plantilla'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Shortcut"
              fullWidth
              value={formData.shortcut}
              onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
              placeholder="/saludo"
              helperText="Debe empezar con / (ej: /saludo)"
            />
            <TextField
              label="Título"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Saludo Inicial"
            />
            <TextField
              label="Contenido"
              fullWidth
              multiline
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Hola {{clientName}}, soy {{agentName}}..."
              helperText="Usa {{variable}} para campos dinámicos"
            />
            <TextField
              select
              label="Categoría"
              fullWidth
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <MenuItem value="">Sin categoría</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Campaña (Opcional)"
              fullWidth
              value={formData.campaignId}
              onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
            >
              <MenuItem value="">Global (todas las campañas)</MenuItem>
              {campaigns.map((campaign) => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingTemplate ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Estadísticas */}
      <Dialog
        open={openStatsDialog}
        onClose={() => setOpenStatsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Estadísticas de Plantillas</DialogTitle>
        <DialogContent>
          {stats && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white', textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalTemplates}
                  </Typography>
                  <Typography>Total Plantillas</Typography>
                </Card>
                <Card sx={{ bgcolor: 'success.main', color: 'white', textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalUsage}
                  </Typography>
                  <Typography>Total Usos</Typography>
                </Card>
              </Box>

              <Typography variant="h6" gutterBottom>
                Top 5 Plantillas Más Usadas
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Título</TableCell>
                      <TableCell>Shortcut</TableCell>
                      <TableCell align="right">Usos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>{template.title}</TableCell>
                        <TableCell>{template.shortcut}</TableCell>
                        <TableCell align="right">{template.usageCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatsDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default TemplatesManagement;
