import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface Evidence {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  evidenceType: 'image' | 'pdf';
  paymentAmount: number;
  paymentDate: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  uploader?: { fullName: string };
  reviewer?: { fullName: string };
  reviewedAt?: string;
  reviewNotes?: string;
  metadata?: {
    referenceNumber?: string;
  };
}

interface EvidenceGalleryProps {
  clientId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  onUpdate?: () => void;
  canReview?: boolean;
  canDelete?: boolean;
}

export default function EvidenceGallery({
  clientId,
  status,
  onUpdate,
  canReview = false,
  canDelete = false,
}: EvidenceGalleryProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvidences();
  }, [clientId, status]);

  const loadEvidences = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (clientId) params.clientId = clientId;
      if (status) params.status = status;

      const response = await api.get('/payment-evidences', { params });
      // El backend tiene TransformInterceptor: response.data.data.data
      const evidencesData = response.data?.data?.data || response.data?.data || [];
      const evidencesArray = Array.isArray(evidencesData) ? evidencesData : [];
      setEvidences(evidencesArray);
    } catch (err) {
      console.error('Error al cargar evidencias:', err);
      setEvidences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvidence = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
  };

  const handleCloseViewer = () => {
    setSelectedEvidence(null);
  };

  const handleOpenReview = (evidence: Evidence, action: 'approved' | 'rejected') => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!selectedEvidence) return;

    setProcessing(true);
    setError('');

    try {
      await api.patch(`/payment-evidences/${selectedEvidence.id}/review`, {
        status: reviewAction,
        reviewNotes,
      });

      setReviewDialogOpen(false);
      loadEvidences();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al revisar evidencia');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta evidencia?')) return;

    try {
      await api.delete(`/payment-evidences/${evidenceId}`);
      loadEvidences();
      onUpdate?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar evidencia');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusChip = (status: 'pending' | 'approved' | 'rejected') => {
    const config = {
      pending: { label: 'Pendiente', color: 'warning' as const },
      approved: { label: 'Aprobada', color: 'success' as const },
      rejected: { label: 'Rechazada', color: 'error' as const },
    };
    return <Chip label={config[status].label} color={config[status].color} size="small" />;
  };

  const getFileUrl = (filePath: string) => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${filePath}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (evidences.length === 0) {
    return (
      <Alert severity="info">
        No hay evidencias de pago{status ? ` en estado ${status}` : ''}.
      </Alert>
    );
  }

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {evidences.map((evidence) => (
          <Box key={evidence.id}>
            <Card>
              {evidence.evidenceType === 'image' ? (
                <CardMedia
                  component="img"
                  height="140"
                  image={getFileUrl(evidence.filePath)}
                  alt={evidence.fileName}
                  sx={{ cursor: 'pointer', objectFit: 'cover' }}
                  onClick={() => handleViewEvidence(evidence)}
                />
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height="140px"
                  bgcolor="grey.200"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewEvidence(evidence)}
                >
                  <PdfIcon sx={{ fontSize: 60, color: 'error.main' }} />
                </Box>
              )}

              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="div" fontWeight="bold" color="success.main">
                    {formatCurrency(evidence.paymentAmount)}
                  </Typography>
                  {getStatusChip(evidence.status)}
                </Box>

                <Typography variant="body2" color="textSecondary">
                  Fecha: {formatDate(evidence.paymentDate)}
                </Typography>

                {evidence.metadata?.referenceNumber && (
                  <Typography variant="body2" color="textSecondary">
                    Ref: {evidence.metadata.referenceNumber}
                  </Typography>
                )}

                <Typography variant="caption" display="block" mt={1} color="textSecondary">
                  Subido por: {evidence.uploader?.fullName || 'N/A'}
                </Typography>

                {evidence.status === 'pending' && canReview && (
                  <Box display="flex" gap={1} mt={2}>
                    <Tooltip title="Aprobar">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenReview(evidence, 'approved')}
                      >
                        <ApproveIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rechazar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenReview(evidence, 'rejected')}
                      >
                        <RejectIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver detalles">
                      <IconButton size="small" onClick={() => handleViewEvidence(evidence)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                {canDelete && (
                  <Box mt={2}>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(evidence.id)}
                      fullWidth
                    >
                      Eliminar
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Viewer Dialog */}
      <Dialog
        open={!!selectedEvidence && !reviewDialogOpen}
        onClose={handleCloseViewer}
        maxWidth="md"
        fullWidth
      >
        {selectedEvidence && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Evidencia de Pago</Typography>
                <IconButton onClick={handleCloseViewer} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent>
              {selectedEvidence.evidenceType === 'image' ? (
                <img
                  src={getFileUrl(selectedEvidence.filePath)}
                  alt={selectedEvidence.fileName}
                  style={{ width: '100%', height: 'auto' }}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <PdfIcon sx={{ fontSize: 100, color: 'error.main' }} />
                  <Typography variant="h6" mt={2}>
                    Documento PDF
                  </Typography>
                  <Button
                    variant="outlined"
                    href={getFileUrl(selectedEvidence.filePath)}
                    target="_blank"
                    sx={{ mt: 2 }}
                  >
                    Abrir en nueva pestaña
                  </Button>
                </Box>
              )}

              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Detalles del Pago
                </Typography>
                <Typography>
                  <strong>Monto:</strong> {formatCurrency(selectedEvidence.paymentAmount)}
                </Typography>
                <Typography>
                  <strong>Fecha:</strong> {formatDate(selectedEvidence.paymentDate)}
                </Typography>
                <Typography>
                  <strong>Estado:</strong> {getStatusChip(selectedEvidence.status)}
                </Typography>
                {selectedEvidence.metadata?.referenceNumber && (
                  <Typography>
                    <strong>Referencia:</strong> {selectedEvidence.metadata.referenceNumber}
                  </Typography>
                )}
                {selectedEvidence.notes && (
                  <Typography>
                    <strong>Notas:</strong> {selectedEvidence.notes}
                  </Typography>
                )}
                {selectedEvidence.reviewNotes && (
                  <Alert severity={selectedEvidence.status === 'approved' ? 'success' : 'error'} sx={{ mt: 2 }}>
                    <strong>Revisión:</strong> {selectedEvidence.reviewNotes}
                  </Alert>
                )}
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseViewer}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => !processing && setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'approved' ? '✅ Aprobar Evidencia' : '❌ Rechazar Evidencia'}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Notas de Revisión"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            fullWidth
            multiline
            rows={4}
            disabled={processing}
            helperText="Opcional: agregue comentarios sobre la revisión"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleReview}
            variant="contained"
            color={reviewAction === 'approved' ? 'success' : 'error'}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Procesando...' : reviewAction === 'approved' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
