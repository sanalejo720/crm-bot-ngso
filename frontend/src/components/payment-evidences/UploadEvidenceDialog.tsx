import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface UploadEvidenceDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

export default function UploadEvidenceDialog({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
}: UploadEvidenceDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Debe seleccionar un archivo');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('paymentAmount', paymentAmount);
      formData.append('paymentDate', paymentDate);
      
      if (notes) formData.append('notes', notes);
      if (referenceNumber) formData.append('referenceNumber', referenceNumber);

      await api.post('/payment-evidences/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset form
      setFile(null);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setReferenceNumber('');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir la evidencia');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setError('');
      onClose();
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num ? parseInt(num).toLocaleString('es-CO') : '';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPaymentAmount(rawValue);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">📎 Subir Evidencia de Pago</Typography>
          <IconButton onClick={handleClose} disabled={loading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="textSecondary">
          Cliente: {clientName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* File Upload */}
          <Box>
            <input
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              style={{ display: 'none' }}
              id="evidence-file"
              type="file"
              onChange={handleFileChange}
              disabled={loading}
            />
            <label htmlFor="evidence-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
                disabled={loading}
              >
                {file ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
              </Button>
            </label>

            {file && (
              <Box mt={1} display="flex" alignItems="center" gap={1}>
                <FileIcon color="primary" />
                <Typography variant="body2" flex={1}>
                  {file.name}
                </Typography>
                <Chip
                  label={`${(file.size / 1024).toFixed(0)} KB`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}

            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              Formatos permitidos: JPG, PNG, PDF (máx. 10MB)
            </Typography>
          </Box>

          {/* Payment Amount */}
          <TextField
            label="Monto del Pago"
            value={formatCurrency(paymentAmount)}
            onChange={handleAmountChange}
            fullWidth
            required
            disabled={loading}
            helperText="Ingrese el monto en pesos colombianos"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />

          {/* Payment Date */}
          <TextField
            label="Fecha del Pago"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            required
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
          />

          {/* Reference Number */}
          <TextField
            label="Número de Referencia"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            fullWidth
            disabled={loading}
            helperText="Opcional: número de transacción o recibo"
          />

          {/* Notes */}
          <TextField
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={loading}
            helperText="Información adicional sobre el pago"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !file || !paymentAmount}
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          {loading ? 'Subiendo...' : 'Subir Evidencia'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
