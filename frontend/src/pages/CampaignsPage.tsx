// Campaigns Page - NGS&O CRM Gestión
// Gestión de campañas de cobranza

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'finished';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campaigns');
      setCampaigns(response.data.data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate || '',
        endDate: campaign.endDate || '',
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = async () => {
    try {
      if (editingCampaign) {
        await api.patch(`/campaigns/${editingCampaign.id}`, formData);
      } else {
        await api.post('/campaigns', formData);
      }
      handleCloseDialog();
      loadCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/campaigns/${id}`, { status });
      loadCampaigns();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'finished': return 'default';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'paused': return 'Pausada';
      case 'finished': return 'Finalizada';
      case 'draft': return 'Borrador';
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
                Campañas de Cobranza
              </Typography>
              <Typography variant="body1" sx={{ color: '#718096' }}>
                Gestiona las campañas activas y su configuración
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              px: 3,
            }}
          >
            Nueva Campaña
          </Button>
        </Box>

        {/* Campaigns Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {campaigns.map((campaign) => (
            <Box key={campaign.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {campaign.name}
                    </Typography>
                    <Chip
                      label={getStatusLabel(campaign.status)}
                      color={getStatusColor(campaign.status) as any}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {campaign.description}
                  </Typography>

                  {campaign.startDate && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Inicio: {new Date(campaign.startDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {campaign.endDate && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Fin: {new Date(campaign.endDate).toLocaleDateString()}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(campaign)}
                      sx={{ color: 'primary.main' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    
                    {campaign.status === 'draft' && (
                      <IconButton
                        size="small"
                        onClick={() => handleChangeStatus(campaign.id, 'active')}
                        sx={{ color: 'success.main' }}
                      >
                        <PlayArrow fontSize="small" />
                      </IconButton>
                    )}
                    
                    {campaign.status === 'active' && (
                      <IconButton
                        size="small"
                        onClick={() => handleChangeStatus(campaign.id, 'paused')}
                        sx={{ color: 'warning.main' }}
                      >
                        <Pause fontSize="small" />
                      </IconButton>
                    )}
                    
                    {campaign.status === 'paused' && (
                      <IconButton
                        size="small"
                        onClick={() => handleChangeStatus(campaign.id, 'active')}
                        sx={{ color: 'success.main' }}
                      >
                        <PlayArrow fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        {campaigns.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay campañas creadas. Crea tu primera campaña para comenzar.
          </Alert>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nombre de la Campaña"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              
              <TextField
                label="Fecha de Inicio"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Fecha de Fin"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSaveCampaign}
              variant="contained"
              disabled={!formData.name}
            >
              {editingCampaign ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
