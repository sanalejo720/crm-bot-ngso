// Backups Page - NGS&O CRM Gestión
// Panel IT para gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface Backup {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'processing' | 'completed' | 'failed';
  type: 'manual' | 'scheduled';
  isEncrypted: boolean;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  createdBy?: {
    id: string;
    name: string;
  };
  metadata?: {
    databaseSize?: number;
    filesSize?: number;
    compressionRatio?: number;
  };
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloadDialog, setDownloadDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/backups');
      
      // El backend devuelve { success: true, data: { success: true, data: [...] } }
      // Necesitamos acceder al array en response.data.data.data
      const backupsData = response.data?.data?.data || [];
      
      // Asegurar que sea un array
      if (!Array.isArray(backupsData)) {
        console.error('❌ La respuesta no contiene un array de backups:', backupsData);
        setBackups([]);
        return;
      }
        
      setBackups(backupsData);
      console.log(`✅ ${backupsData.length} backups cargados`);
    } catch (error: any) {
      console.error('❌ Error cargando backups:', error);
      alert(error.response?.data?.message || 'Error al cargar backups');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/backups', { type: 'manual' });
      
      // SEGURIDAD: La contraseña NO se devuelve en la respuesta
      // Fue enviada automáticamente por email a gerencia
      alert('✅ Backup creado exitosamente.\n\n🔒 La contraseña maestra ha sido enviada al correo de gerencia (san.alejo0720@gmail.com).\n\n⚠️ Por seguridad, la contraseña NO se muestra en la aplicación.');
      
      // Recargar lista
      await loadBackups();
    } catch (error: any) {
      console.error('Error creando backup:', error);
      alert(error.response?.data?.message || 'Error al crear backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!selectedBackup || !password) return;

    try {
      const response = await api.post(
        `/backups/${selectedBackup.id}/download`,
        { password },
        { responseType: 'blob' }
      );

      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedBackup.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDownloadDialog(false);
      setPassword('');
      setSelectedBackup(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Contraseña incorrecta o error al descargar');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('¿Estás seguro de eliminar este backup? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/backups/${backupId}`);
      await loadBackups();
    } catch (error) {
      console.error('Error eliminando backup:', error);
      alert('Error al eliminar backup');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      processing: { label: 'Procesando', color: 'info' as const },
      completed: { label: 'Completado', color: 'success' as const },
      failed: { label: 'Fallido', color: 'error' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <ModernSidebar />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ flexGrow: 1, p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                Backups Cifrados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sistema de respaldo con cifrado AES-256. Solo Super Admin/IT pueden gestionar.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadBackups}
                disabled={loading}
              >
                Actualizar
              </Button>
              <Button
                variant="contained"
                startIcon={creating ? <CircularProgress size={20} /> : <BackupIcon />}
                onClick={handleCreateBackup}
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crear Backup Ahora'}
              </Button>
            </Box>
          </Box>

          {/* Alert de seguridad */}
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              🔐 Importante sobre Seguridad:
            </Typography>
            <Typography variant="body2">
              • La contraseña maestra se muestra SOLO UNA VEZ al crear el backup<br />
              • NO se almacena en la base de datos por seguridad<br />
              • Si pierdes la contraseña, NO podrás descargar el backup<br />
              • Guarda la contraseña en un lugar seguro (gestor de contraseñas, caja fuerte digital)
            </Typography>
          </Alert>

          {/* Tabla de backups */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historial de Backups
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : backups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BackupIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography color="text.secondary">
                    No hay backups creados aún. Crea el primero haciendo clic en "Crear Backup Ahora".
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Archivo</TableCell>
                        <TableCell>Tamaño</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Creado por</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SecurityIcon fontSize="small" color="primary" />
                              <Typography variant="body2">{backup.fileName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                          <TableCell>{getStatusChip(backup.status)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={backup.type === 'manual' ? 'Manual' : 'Automático'} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {backup.createdBy?.name || 'Sistema'}
                          </TableCell>
                          <TableCell>
                            {new Date(backup.createdAt).toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Descargar backup">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={backup.status !== 'completed'}
                                  onClick={() => {
                                    setSelectedBackup(backup);
                                    setDownloadDialog(true);
                                  }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Eliminar backup">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteBackup(backup.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog para descargar backup */}
      <Dialog open={downloadDialog} onClose={() => setDownloadDialog(false)}>
        <DialogTitle>🔐 Descargar Backup Cifrado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingresa la contraseña maestra que recibiste cuando creaste este backup.
          </Typography>
          
          <TextField
            autoFocus
            label="Contraseña Maestra"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa la contraseña de 32 caracteres"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDownloadDialog(false);
            setPassword('');
          }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDownloadBackup} 
            variant="contained"
            disabled={!password}
          >
            Descargar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
