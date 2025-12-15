import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Chip,
  Stack,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Campaign as CampaignIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  status: string;
  campaignId?: string;
}

interface UploadResult {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  duplicated: number;
  failed: number;
  errors: UploadError[];
  summary: {
    totalDebt: number;
    averageDaysOverdue: number;
    byDocumentType: Record<string, number>;
  };
}

interface UploadError {
  row: number;
  documentNumber?: string;
  fullName?: string;
  error: string;
  details?: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UploadDebtorsDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Campaign and WhatsApp number selection
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedWhatsappNumberId, setSelectedWhatsappNumberId] = useState<string>('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  // Fetch campaigns on mount
  useEffect(() => {
    if (open) {
      fetchCampaigns();
      fetchWhatsappNumbers();
    }
  }, [open]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await api.get('/campaigns');
      const data = response.data.data || response.data || [];
      setCampaigns(Array.isArray(data) ? data.filter((c: Campaign) => c.isActive) : []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error al cargar campañas');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchWhatsappNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const response = await api.get('/whatsapp-numbers');
      const data = response.data.data || response.data || [];
      setWhatsappNumbers(Array.isArray(data) ? data.filter((n: WhatsAppNumber) => n.status === 'connected' || n.status === 'active') : []);
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
      toast.error('Error al cargar números de WhatsApp');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleCampaignChange = (event: SelectChangeEvent) => {
    setSelectedCampaignId(event.target.value);
  };

  const handleWhatsappNumberChange = (event: SelectChangeEvent) => {
    setSelectedWhatsappNumberId(event.target.value);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Formato de archivo no válido. Solo se permiten CSV y Excel (.xlsx, .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es muy grande. Tamaño máximo: 10MB');
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    if (!selectedCampaignId) {
      toast.warning('Por favor selecciona una campaña');
      return;
    }
    
    if (!selectedWhatsappNumberId) {
      toast.warning('Por favor selecciona un número de WhatsApp');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('campaignId', selectedCampaignId);
    formData.append('whatsappNumberId', selectedWhatsappNumberId);

    try {
      const response = await api.post<{ success: boolean; message: string; data: UploadResult }>(
        '/debtors/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      setResult(response.data.data);

      if (response.data.data.success) {
        toast.success(
          `✅ Archivo procesado: ${response.data.data.created} creados, ${response.data.data.updated} actualizados`
        );
        onSuccess?.();
      } else {
        toast.warning(
          `⚠️ Procesado con errores: ${response.data.data.failed} filas fallidas`
        );
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setResult(null);
      setShowErrors(false);
      setSelectedCampaignId('');
      setSelectedWhatsappNumberId('');
      onClose();
    }
  };

  const downloadTemplate = () => {
    const template = `nombre,tipo_doc,documento,telefono,correo,direccion,deuda,deuda_inicial,mora,ultimo_pago,promesa,estado,notas,producto,credito,vencimiento,compania,campana
Juan Perez,CC,1234567890,3001234567,juan@example.com,Calle 123 #45-67,1500000,2000000,30,2024-10-15,2024-12-01,active,Cliente con buen historial,Tarjeta de Crédito,TC-001,2024-11-30,Banco XYZ,CAMP-001`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-deudores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Cargar Base de Datos</Typography>
          <IconButton onClick={handleClose} disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Información */}
          <Alert severity="info">
            Sube un archivo CSV o Excel (.xlsx, .xls) con la información de los deudores.
            <br />
            <strong>Columnas requeridas:</strong> nombre, tipo_doc, documento
          </Alert>

          {/* Selectores de Campaña y WhatsApp */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 250, flex: 1 }}>
              <InputLabel id="campaign-select-label">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CampaignIcon fontSize="small" />
                  Campaña *
                </Box>
              </InputLabel>
              <Select
                labelId="campaign-select-label"
                id="campaign-select"
                value={selectedCampaignId}
                label="Campaña *"
                onChange={handleCampaignChange}
                disabled={uploading || loadingCampaigns}
              >
                {loadingCampaigns ? (
                  <MenuItem disabled>Cargando...</MenuItem>
                ) : campaigns.length === 0 ? (
                  <MenuItem disabled>No hay campañas disponibles</MenuItem>
                ) : (
                  campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 250, flex: 1 }}>
              <InputLabel id="whatsapp-select-label">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WhatsAppIcon fontSize="small" />
                  Número WhatsApp *
                </Box>
              </InputLabel>
              <Select
                labelId="whatsapp-select-label"
                id="whatsapp-select"
                value={selectedWhatsappNumberId}
                label="Número WhatsApp *"
                onChange={handleWhatsappNumberChange}
                disabled={uploading || loadingNumbers}
              >
                {loadingNumbers ? (
                  <MenuItem disabled>Cargando...</MenuItem>
                ) : whatsappNumbers.length === 0 ? (
                  <MenuItem disabled>No hay números disponibles</MenuItem>
                ) : (
                  whatsappNumbers.map((number) => (
                    <MenuItem key={number.id} value={number.id}>
                      {number.displayName || number.phoneNumber} ({number.phoneNumber})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Botón de plantilla */}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            size="small"
          >
            Descargar Plantilla CSV
          </Button>

          {/* Área de drag & drop */}
          {!result && (
            <Paper
              variant="outlined"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                p: 4,
                textAlign: 'center',
                border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
                backgroundColor: dragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />

              {selectedFile ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Cambiar archivo
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Arrastra un archivo aquí
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    o haz clic para seleccionar
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    CSV, Excel (.xlsx, .xls) - Máx. 10MB
                  </Typography>
                </>
              )}
            </Paper>
          )}

          {/* Progreso */}
          {uploading && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Procesando archivo... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {/* Resultado */}
          {result && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                {/* Header del resultado */}
                <Box display="flex" alignItems="center" gap={1}>
                  {result.success ? (
                    <SuccessIcon color="success" />
                  ) : (
                    <WarningIcon color="warning" />
                  )}
                  <Typography variant="h6">
                    {result.success ? 'Procesado exitosamente' : 'Procesado con errores'}
                  </Typography>
                </Box>

                <Divider />

                {/* Estadísticas */}
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip label={`Total: ${result.totalRows}`} color="default" />
                  {result.created > 0 && (
                    <Chip label={`✅ Creados: ${result.created}`} color="success" />
                  )}
                  {result.updated > 0 && (
                    <Chip label={`🔄 Actualizados: ${result.updated}`} color="info" />
                  )}
                  {result.failed > 0 && (
                    <Chip label={`❌ Fallidos: ${result.failed}`} color="error" />
                  )}
                </Box>

                {/* Resumen financiero */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Resumen:
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="body2">
                      <strong>Deuda Total:</strong> {formatCurrency(result.summary.totalDebt)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Mora Promedio:</strong> {result.summary.averageDaysOverdue} días
                    </Typography>
                  </Stack>
                </Box>

                {/* Por tipo de documento */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Por Tipo de Documento:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(result.summary.byDocumentType).map(([type, count]) => (
                      <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>

                {/* Errores */}
                {result.errors.length > 0 && (
                  <Box>
                    <Button
                      startIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => setShowErrors(!showErrors)}
                      size="small"
                      color="error"
                    >
                      Ver Errores ({result.errors.length})
                    </Button>

                    <Collapse in={showErrors}>
                      <TableContainer sx={{ mt: 2, maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Fila</TableCell>
                              <TableCell>Documento</TableCell>
                              <TableCell>Nombre</TableCell>
                              <TableCell>Error</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.errors.slice(0, 50).map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.documentNumber || '-'}</TableCell>
                                <TableCell>{error.fullName || '-'}</TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="error">
                                    {error.error}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {result.errors.length > 50 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Mostrando primeros 50 errores de {result.errors.length}
                        </Typography>
                      )}
                    </Collapse>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {result ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            startIcon={<UploadIcon />}
          >
            {uploading ? 'Procesando...' : 'Cargar Archivo'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
