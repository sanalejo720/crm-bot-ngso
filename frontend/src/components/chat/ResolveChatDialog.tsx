// Resolve Chat Dialog - NGS&O CRM Gestión
// Diálogo para cerrar chat con opciones de resultado

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Cancel,
  PhoneCallback,
  AttachMoney,
  CreditCard,
  AccountBalance,
  LocalAtm,
} from '@mui/icons-material';
import type { Chat, Client } from '../../types/index';
import { formatCurrency } from '../../utils/helpers';

export type ResolutionType = 'paid' | 'promise' | 'no_agreement' | 'callback';

export interface ResolutionData {
  type: ResolutionType;
  // Para pagos
  paymentMethod?: string;
  paymentAmount?: number;
  paymentDate?: string;
  // Para promesas
  promiseDate?: string;
  promiseAmount?: number;
  promisePaymentMethod?: string;
  // Para sin acuerdo
  noAgreementReason?: string;
  // Para callback
  callbackDate?: string;
  callbackNotes?: string;
  // General
  notes?: string;
  sendClosingMessage?: boolean;
}

interface ResolveChatDialogProps {
  open: boolean;
  onClose: () => void;
  onResolve: (data: ResolutionData) => Promise<void>;
  chat: Chat;
  client: Client | null;
}

const PAYMENT_METHODS = [
  { id: 'transfer', label: 'Transferencia Bancaria', icon: <AccountBalance /> },
  { id: 'pse', label: 'PSE', icon: <CreditCard /> },
  { id: 'card', label: 'Tarjeta Crédito/Débito', icon: <CreditCard /> },
  { id: 'cash', label: 'Efectivo', icon: <LocalAtm /> },
  { id: 'other', label: 'Otro', icon: <AttachMoney /> },
];

const NO_AGREEMENT_REASONS = [
  { id: 'no_money', label: 'Sin capacidad de pago actual' },
  { id: 'disputes_debt', label: 'Disputa la deuda' },
  { id: 'wrong_person', label: 'Persona incorrecta' },
  { id: 'no_interest', label: 'No tiene interés en pagar' },
  { id: 'needs_more_info', label: 'Necesita más información' },
  { id: 'other', label: 'Otro motivo' },
];

export default function ResolveChatDialog({
  open,
  onClose,
  onResolve,
  chat: _chat, // eslint-disable-line @typescript-eslint/no-unused-vars
  client,
}: ResolveChatDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [resolutionType, setResolutionType] = useState<ResolutionType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(client?.debtAmount || 0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState<number>(client?.debtAmount || 0);
  const [promisePaymentMethod, setPromisePaymentMethod] = useState('');
  const [noAgreementReason, setNoAgreementReason] = useState('');
  const [noAgreementOtherReason, setNoAgreementOtherReason] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackNotes, setCallbackNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [sendClosingMessage, setSendClosingMessage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setResolutionType(null);
      setPaymentMethod('');
      setPaymentAmount(client?.debtAmount || 0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPromiseDate('');
      setPromiseAmount(client?.debtAmount || 0);
      setPromisePaymentMethod('');
      setNoAgreementReason('');
      setNoAgreementOtherReason('');
      setCallbackDate('');
      setCallbackNotes('');
      setNotes('');
      setSendClosingMessage(true);
      setError('');
    }
  }, [open, client]);

  const getSteps = () => {
    if (!resolutionType) return ['Seleccionar resultado'];
    
    switch (resolutionType) {
      case 'paid':
        return ['Seleccionar resultado', 'Detalles del pago', 'Confirmar'];
      case 'promise':
        return ['Seleccionar resultado', 'Detalles de la promesa', 'Confirmar'];
      case 'no_agreement':
        return ['Seleccionar resultado', 'Motivo', 'Confirmar'];
      case 'callback':
        return ['Seleccionar resultado', 'Detalles callback', 'Confirmar'];
      default:
        return ['Seleccionar resultado'];
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const canProceed = () => {
    if (activeStep === 0) return resolutionType !== null;
    
    switch (resolutionType) {
      case 'paid':
        return activeStep === 1 ? paymentMethod && paymentAmount > 0 : true;
      case 'promise':
        return activeStep === 1 ? promiseDate && promiseAmount > 0 && promisePaymentMethod : true;
      case 'no_agreement':
        return activeStep === 1 ? noAgreementReason && (noAgreementReason !== 'other' || noAgreementOtherReason) : true;
      case 'callback':
        return activeStep === 1 ? callbackDate : true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const data: ResolutionData = {
        type: resolutionType!,
        sendClosingMessage,
        notes,
      };

      switch (resolutionType) {
        case 'paid':
          data.paymentMethod = paymentMethod;
          data.paymentAmount = paymentAmount;
          data.paymentDate = paymentDate;
          break;
        case 'promise':
          data.promiseDate = promiseDate;
          data.promiseAmount = promiseAmount;
          data.promisePaymentMethod = promisePaymentMethod;
          break;
        case 'no_agreement':
          data.noAgreementReason = noAgreementReason === 'other' ? noAgreementOtherReason : noAgreementReason;
          break;
        case 'callback':
          data.callbackDate = callbackDate;
          data.callbackNotes = callbackNotes;
          break;
      }

      await onResolve(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al resolver el chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResolutionIcon = (type: ResolutionType) => {
    switch (type) {
      case 'paid':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'promise':
        return <Schedule sx={{ color: 'warning.main' }} />;
      case 'no_agreement':
        return <Cancel sx={{ color: 'error.main' }} />;
      case 'callback':
        return <PhoneCallback sx={{ color: 'info.main' }} />;
    }
  };

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            ¿Cuál fue el resultado de la gestión?
          </Typography>
          
          <RadioGroup
            value={resolutionType || ''}
            onChange={(e) => setResolutionType(e.target.value as ResolutionType)}
          >
            <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
              <FormControlLabel
                value="paid"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: 'success.main' }} />
                    <Box>
                      <Typography fontWeight="bold">Pago Realizado</Typography>
                      <Typography variant="caption" color="text.secondary">
                        El cliente confirmó que realizó el pago
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  border: 1, 
                  borderColor: resolutionType === 'paid' ? 'success.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  m: 0,
                  bgcolor: resolutionType === 'paid' ? 'success.lighter' : 'transparent',
                }}
              />

              <FormControlLabel
                value="promise"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule sx={{ color: 'warning.main' }} />
                    <Box>
                      <Typography fontWeight="bold">Promesa de Pago</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Se acordó una fecha y monto de pago
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  border: 1, 
                  borderColor: resolutionType === 'promise' ? 'warning.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  m: 0,
                  bgcolor: resolutionType === 'promise' ? 'warning.lighter' : 'transparent',
                }}
              />

              <FormControlLabel
                value="no_agreement"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cancel sx={{ color: 'error.main' }} />
                    <Box>
                      <Typography fontWeight="bold">Sin Acuerdo</Typography>
                      <Typography variant="caption" color="text.secondary">
                        No se logró ningún acuerdo de pago
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  border: 1, 
                  borderColor: resolutionType === 'no_agreement' ? 'error.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  m: 0,
                  bgcolor: resolutionType === 'no_agreement' ? 'error.lighter' : 'transparent',
                }}
              />

              <FormControlLabel
                value="callback"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneCallback sx={{ color: 'info.main' }} />
                    <Box>
                      <Typography fontWeight="bold">Cliente se comunicará</Typography>
                      <Typography variant="caption" color="text.secondary">
                        El cliente indicó que se comunicará después
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  border: 1, 
                  borderColor: resolutionType === 'callback' ? 'info.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  m: 0,
                  bgcolor: resolutionType === 'callback' ? 'info.lighter' : 'transparent',
                }}
              />
            </Box>
          </RadioGroup>
        </Box>
      );
    }

    if (activeStep === 1) {
      switch (resolutionType) {
        case 'paid':
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Detalles del pago
              </Typography>

              <TextField
                fullWidth
                label="Monto pagado"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                sx={{ mb: 2, mt: 2 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />

              <TextField
                fullWidth
                label="Fecha de pago"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />

              <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                Medio de pago:
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mt: 1 }}>
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod(method.id)}
                    startIcon={method.icon}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    {method.label}
                  </Button>
                ))}
              </Box>

              {client?.debtAmount && paymentAmount < client.debtAmount && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Pago parcial: {formatCurrency(paymentAmount)} de {formatCurrency(client.debtAmount)}
                </Alert>
              )}
            </Box>
          );

        case 'promise':
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Detalles de la promesa de pago
              </Typography>

              <TextField
                fullWidth
                label="Fecha de pago"
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2, mt: 2 }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />

              <TextField
                fullWidth
                label="Monto acordado"
                type="number"
                value={promiseAmount}
                onChange={(e) => setPromiseAmount(Number(e.target.value))}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />

              <Typography variant="body2" gutterBottom>
                Medio de pago acordado:
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mt: 1 }}>
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.id}
                    variant={promisePaymentMethod === method.id ? 'contained' : 'outlined'}
                    onClick={() => setPromisePaymentMethod(method.id)}
                    startIcon={method.icon}
                    size="small"
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {method.label}
                  </Button>
                ))}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Se enviará un recordatorio automático el día {promiseDate || '(seleccionar fecha)'}
              </Alert>
            </Box>
          );

        case 'no_agreement':
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Motivo por el cual no se logró acuerdo
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Motivo</InputLabel>
                <Select
                  value={noAgreementReason}
                  label="Motivo"
                  onChange={(e) => setNoAgreementReason(e.target.value)}
                >
                  {NO_AGREEMENT_REASONS.map((reason) => (
                    <MenuItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {noAgreementReason === 'other' && (
                <TextField
                  fullWidth
                  label="Especifique el motivo"
                  value={noAgreementOtherReason}
                  onChange={(e) => setNoAgreementOtherReason(e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          );

        case 'callback':
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                ¿Cuándo se comunicará el cliente?
              </Typography>

              <TextField
                fullWidth
                label="Fecha esperada"
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2, mt: 2 }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />

              <TextField
                fullWidth
                label="Notas adicionales"
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                multiline
                rows={2}
                placeholder="Ej: El cliente indicó que llamará después del almuerzo"
              />
            </Box>
          );
      }
    }

    // Paso de confirmación
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Confirmar cierre de chat
        </Typography>

        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {getResolutionIcon(resolutionType!)}
            <Typography variant="h6">
              {resolutionType === 'paid' && 'Pago Realizado'}
              {resolutionType === 'promise' && 'Promesa de Pago'}
              {resolutionType === 'no_agreement' && 'Sin Acuerdo'}
              {resolutionType === 'callback' && 'Cliente se comunicará'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {resolutionType === 'paid' && (
            <>
              <Typography variant="body2">
                <strong>Monto:</strong> {formatCurrency(paymentAmount)}
              </Typography>
              <Typography variant="body2">
                <strong>Medio:</strong> {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
              </Typography>
            </>
          )}

          {resolutionType === 'promise' && (
            <>
              <Typography variant="body2">
                <strong>Fecha acordada:</strong> {promiseDate}
              </Typography>
              <Typography variant="body2">
                <strong>Monto:</strong> {formatCurrency(promiseAmount)}
              </Typography>
              <Typography variant="body2">
                <strong>Medio:</strong> {PAYMENT_METHODS.find(m => m.id === promisePaymentMethod)?.label}
              </Typography>
            </>
          )}

          {resolutionType === 'no_agreement' && (
            <Typography variant="body2">
              <strong>Motivo:</strong> {noAgreementReason === 'other' 
                ? noAgreementOtherReason 
                : NO_AGREEMENT_REASONS.find(r => r.id === noAgreementReason)?.label}
            </Typography>
          )}

          {resolutionType === 'callback' && (
            <>
              <Typography variant="body2">
                <strong>Fecha esperada:</strong> {callbackDate}
              </Typography>
              {callbackNotes && (
                <Typography variant="body2">
                  <strong>Notas:</strong> {callbackNotes}
                </Typography>
              )}
            </>
          )}
        </Box>

        <TextField
          fullWidth
          label="Notas adicionales (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={2}
          sx={{ mt: 2 }}
        />

        <FormControlLabel
          control={
            <Radio
              checked={sendClosingMessage}
              onChange={() => setSendClosingMessage(!sendClosingMessage)}
            />
          }
          label="Enviar mensaje de cierre al cliente"
          sx={{ mt: 1 }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="primary" />
          Resolver Chat
        </Box>
        {client && (
          <Typography variant="caption" color="text.secondary">
            Cliente: {client.fullName} - Deuda: {formatCurrency(client.debtAmount || 0)}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {getSteps().map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isSubmitting}>
            Atrás
          </Button>
        )}

        {activeStep < getSteps().length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {isSubmitting ? 'Guardando...' : 'Resolver Chat'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
