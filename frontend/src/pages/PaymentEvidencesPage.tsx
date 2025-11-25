import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Badge,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import EvidenceGallery from '../components/payment-evidences/EvidenceGallery';
import UploadEvidenceDialog from '../components/payment-evidences/UploadEvidenceDialog';
import api from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`evidences-tabpanel-${index}`}
      aria-labelledby={`evidences-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PaymentEvidencesPage() {
  const [tabValue, setTabValue] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const response = await api.get('/payment-evidences/pending/count');
      setPendingCount(response.data.data.count);
    } catch (error) {
      console.error('Error al cargar contador:', error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUploadClick = () => {
    // Por ahora, vamos a pedir el clientId manualmente
    // En producción, deberías tener un selector de clientes
    const clientId = prompt('Ingrese el ID del cliente:');
    const clientName = prompt('Ingrese el nombre del cliente:');
    
    if (clientId && clientName) {
      setSelectedClient({ id: clientId, name: clientName });
      setUploadDialogOpen(true);
    }
  };

  const handleUpdate = () => {
    loadPendingCount();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              📎 Evidencias de Pago
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
            >
              Subir Evidencia
            </Button>
          </Box>

          {/* Info Card */}
          <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
            <CardContent>
              <Typography color="white" variant="body1">
                💡 <strong>Sistema de Evidencias:</strong> Suba comprobantes de pago (imágenes o PDF) para 
                documentar los pagos de los clientes. Las evidencias deben ser aprobadas por un supervisor 
                antes de ser procesadas.
              </Typography>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardContent>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="evidences tabs">
                <Tab
                  icon={
                    <Badge badgeContent={pendingCount} color="warning">
                      <PendingIcon />
                    </Badge>
                  }
                  label="Pendientes"
                  iconPosition="start"
                />
                <Tab icon={<ApprovedIcon />} label="Aprobadas" iconPosition="start" />
                <Tab icon={<RejectedIcon />} label="Rechazadas" iconPosition="start" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <EvidenceGallery
                  status="pending"
                  canReview={true}
                  canDelete={false}
                  onUpdate={handleUpdate}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <EvidenceGallery
                  status="approved"
                  canReview={false}
                  canDelete={false}
                  onUpdate={handleUpdate}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <EvidenceGallery
                  status="rejected"
                  canReview={false}
                  canDelete={true}
                  onUpdate={handleUpdate}
                />
              </TabPanel>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Upload Dialog */}
      {selectedClient && (
        <UploadEvidenceDialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onSuccess={handleUpdate}
        />
      )}
    </Box>
  );
}
