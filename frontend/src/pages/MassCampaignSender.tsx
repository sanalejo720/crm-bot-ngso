import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload,
  Send,
  CheckCircle,
  Error,
  Download,
  Visibility,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

// Plantillas aprobadas de Twilio (contenido exacto de templates.md)
const WHATSAPP_TEMPLATES = [
  { 
    id: 'contacto_inicial', 
    sid: 'HX87f380266edfc0d2c150932e7c716d16', 
    name: 'Contacto Inicial', 
    variables: 3, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., se comunica con usted respecto a su contrato de arrendamiento.\n\n📋 Solicitud: {{2}}\n\nQueremos brindarle información importante. Por favor responda a este mensaje para continuar la conversación.\n\nAtentamente,\n{{3}}\nNGS&O Abogados' 
  },
  { 
    id: 'vigente_aviso_1', 
    sid: 'HX53a51112ac3e59f30a17e17c382bb361', 
    name: 'Vigente - Aviso 1', 
    variables: 3, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que tiene valores pendientes en el pago de los cánones correspondientes a su contrato de arrendamiento.\n\n📋 Solicitud: {{2}}\n\nLe invitamos a regularizar su situación. Solicite su link de pago respondiendo a este mensaje y con gusto le asistimos.\n\nSi tiene alguna dificultad, cuéntenos para buscar alternativas.\n\nAtentamente,\n{{3}}\nNGS&O Abogados' 
  },
  { 
    id: 'vigente_aviso_2', 
    sid: 'HX0bb45dfd6b84d0c66db9b684035c74b1', 
    name: 'Vigente - Aviso 2', 
    variables: 5, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que presenta un saldo pendiente de más de {{2}} días en el pago de los cánones de su contrato de arrendamiento.\n\n📋 Solicitud: {{3}}\n\nEs importante regularizar su situación para evitar inconvenientes. Le invitamos a solicitar su link de pago en los próximos {{4}} días respondiendo a este mensaje.\n\nAtentamente,\n{{5}}\nNGS&O Abogados' 
  },
  { 
    id: 'vigente_aviso_3', 
    sid: 'HXbec9cc11ba19ca9015fa7863089990b3', 
    name: 'Vigente - Aviso 3', 
    variables: 4, 
    preview: 'Estimado(a) {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le contacta con información importante sobre su contrato de arrendamiento.\n\n💰 Valor pendiente: {{2}}\n🏠 Inmueble: {{3}}\n🏢 Arrendador: {{4}}\n\nEs necesario que nos contacte en los próximos días para revisar su situación y brindarle opciones de solución.\n\nEstamos para ayudarle.\n\nAtentamente,\nNGS&O Abogados' 
  },
  { 
    id: 'desocupado_aviso_1', 
    sid: 'HX9265068e47eeaa825cc6323100a9cd37', 
    name: 'Desocupado - Aviso 1', 
    variables: 5, 
    preview: 'Señor(a) {{1}}\n\nASUNTO: ¡Oportunidad para regularizar su situación! - Solicitud: {{2}}\n\nCordial saludo.\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le reitera la invitación al pago de la obligación pendiente por cánones del contrato de arrendamiento con {{3}}.\n\n🎉 Lo invitamos a acogerse a nuestra campaña de descuentos vigente hasta el {{4}}.\n\nPara conocer su beneficio y realizar el pago, comuníquese con {{5}}:\n📞 (601) 4320170 – opción 4\n📱 333 0334068 – opción 4\n\nSi ya realizó el pago, haga caso omiso. ¡Gracias!' 
  },
  { 
    id: 'desocupado_aviso_2', 
    sid: 'HX6b5e9513116d798f4c3037df0a632f1f', 
    name: 'Desocupado - Aviso 2', 
    variables: 5, 
    preview: 'Cordial saludo,\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., solicita la atención de {{1}} respecto a valores pendientes del contrato de arrendamiento con {{2}}.\n\n🏠 Inmueble: {{3}}\n📍 Ciudad: {{4}}\n\nQueremos ayudarle a encontrar una solución. Si lo desea, podemos llamarle para explicarle las alternativas disponibles.\n\n📞 (601) 4320170 – opción 4\n📱 333 0334068 – opción 4\n\nResponda a este mensaje si prefiere que le llamemos.\n\n📋 Solicitud: {{5}}\n\nAtentamente,\nNGS&O Abogados' 
  },
  { 
    id: 'desistido_aviso_1', 
    sid: 'HXb8a3b111a30e4800e703788602edd25e', 
    name: 'Desistido - Aviso 1', 
    variables: 4, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que la inmobiliaria ha reportado un saldo pendiente en el pago del canon de arrendamiento correspondiente al periodo de {{2}}.\n\n📋 Solicitud: {{3}}\n\nPara regularizar su situación, le invitamos a realizar el pago directamente a la inmobiliaria y enviar el soporte por este medio.\n\nSi ya realizó el pago, por favor haga caso omiso.\n\nAtentamente,\n{{4}}\nNGS&O Abogados' 
  },
  { 
    id: 'desistido_aviso_2', 
    sid: 'HX5dba8fa1980232522f42477eea34d4a8', 
    name: 'Desistido - Aviso 2', 
    variables: 5, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que a la fecha no se ha registrado el pago de los cánones de arrendamiento correspondientes a {{2}}.\n\n📋 Solicitud: {{3}}\n\nEs importante que nos contacte antes del {{4}} para encontrar la mejor solución y evitar inconvenientes adicionales.\n\nPara regularizar su situación, realice el pago directamente a la inmobiliaria y envíe el soporte por este medio.\n\nAtentamente,\n{{5}}\nNGS&O Abogados' 
  },
  { 
    id: 'desistido_aviso_3', 
    sid: 'HXdd3a892fcfb888ee6515e1fdcab30db4', 
    name: 'Desistido - Aviso 3', 
    variables: 4, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que los cánones de arrendamiento continúan pendientes.\n\n📋 Solicitud: {{2}}\n\nLe recordamos que tiene plazo hasta el {{3}} para regularizar su situación directamente con la inmobiliaria. Después de esta fecha, su caso pasará a otra instancia de gestión.\n\nPor favor realice el pago y envíe el soporte por este medio o al correo ellibertador@ngsoabogados.com\n\nAtentamente,\n{{4}}\nNGS&O Abogados' 
  },
  { 
    id: 'confirmacion_pago', 
    sid: 'HXeb7d072ea5a5e23b973b05129d64f596', 
    name: 'Confirmación de Pago', 
    variables: 5, 
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., confirma la recepción de su pago.\n\n📋 Solicitud: {{2}}\n💰 Valor recibido: {{3}}\n📅 Fecha: {{4}}\n\nGracias por regularizar su situación. Si tiene alguna consulta adicional, estamos para servirle.\n\nAtentamente,\n{{5}}\nNGS&O Abogados' 
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  recipientCount: number;
  preview: Array<{ phone: string; variables: Record<string, string> }>;
}

interface CampaignResult {
  success: boolean;
  campaignName?: string;
  message?: string;
  recipientCount?: number;
  estimatedDuration?: number;
  total?: number;
  sent?: number;
  failed?: number;
  errors?: Array<{ phone: string; error: string }>;
}

export default function MassCampaignSender() {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState('');
  
  // Configuración de rate limiting
  const [messageDelay, setMessageDelay] = useState(1000); // 1 segundo por defecto
  const [batchSize, setBatchSize] = useState(10); // 10 mensajes por lote
  
  // Progress tracking
  const [currentProgress, setCurrentProgress] = useState(0);
  const [sendingStatus, setSendingStatus] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor seleccione un archivo CSV válido');
        return;
      }
      setFile(selectedFile);
      setValidation(null);
      setResult(null);
      setError('');
    }
  };

  const validateFile = async () => {
    if (!file) {
      setError('Por favor seleccione un archivo CSV');
      return;
    }

    setLoading(true);
    setError('');
    setValidation(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiService.post('/campaigns/mass/validate-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Validation response completa:', response);
      console.log('Validation response.data:', response.data);

      // La API devuelve {success: true, data: {...}}
      const apiData = response.data.data || response.data;
      
      console.log('API data extraída:', apiData);

      // Asegurar que la respuesta tenga la estructura correcta
      const validationData: ValidationResult = {
        valid: apiData.valid !== undefined ? apiData.valid : false,
        errors: Array.isArray(apiData.errors) ? apiData.errors : [],
        recipientCount: apiData.recipientCount || 0,
        preview: Array.isArray(apiData.preview) ? apiData.preview : []
      };

      console.log('Validation data procesada:', validationData);

      setValidation(validationData);
      
      if (!validationData.valid && validationData.errors.length > 0) {
        setError('El archivo CSV tiene errores. Por favor revíselos.');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      setError(err.response?.data?.message || 'Error al validar el archivo');
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async () => {
    if (!file || !campaignName || !selectedTemplate) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    if (validation && !validation.valid) {
      setError('Por favor corrija los errores del CSV antes de enviar');
      return;
    }

    setSending(true);
    setError('');
    setCurrentProgress(0);
    setSendingStatus('Preparando envío...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignName', campaignName);
      formData.append('templateSid', selectedTemplate);
      formData.append('messageDelay', messageDelay.toString());
      formData.append('batchSize', batchSize.toString());
      if (description) formData.append('description', description);

      setSendingStatus('Iniciando campaña...');

      const response = await apiService.post('/campaigns/mass/upload-and-send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setSendingStatus('Campaña iniciada - Los mensajes se están enviando en segundo plano');
        
        // Simular progreso basado en la estimación
        const estimatedSeconds = response.data.estimatedDuration || 60;
        const progressIncrement = 100 / (estimatedSeconds * 2); // Actualizar cada 500ms
        
        const progressInterval = setInterval(() => {
          setCurrentProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return Math.min(prev + progressIncrement, 100);
          });
        }, 500);

        // Limpiar después del tiempo estimado + margen
        setTimeout(() => {
          clearInterval(progressInterval);
          setCurrentProgress(100);
          setSendingStatus('Envío completado - Revisa los logs del servidor para detalles');
        }, (estimatedSeconds + 10) * 1000);

        setResult({
          success: true,
          message: response.data.message,
          campaignName: response.data.campaignName,
          recipientCount: response.data.recipientCount,
          estimatedDuration: response.data.estimatedDuration,
        });
        
        // Limpiar formulario después de envío exitoso
        setCampaignName('');
        setDescription('');
        setSelectedTemplate('');
        setFile(null);
        setValidation(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar la campaña');
      setSendingStatus('Error en el envío');
    } finally {
      setSending(false);
    }
  };

  const downloadSampleCsv = () => {
    const template = WHATSAPP_TEMPLATES.find(t => t.sid === selectedTemplate);
    const varCount = template?.variables || 3;
    
    let csvContent = 'phone';
    for (let i = 1; i <= varCount; i++) {
      csvContent += `,var${i}`;
    }
    csvContent += ',agentEmail\n';
    
    // Ejemplos según la plantilla seleccionada
    if (template?.id === 'vigente_aviso_2') {
      csvContent += '573001234567,JUAN PEREZ,60,10732468,5,maria.garcia@ngsoabogados.com,maria.garcia@ngsoabogados.com\n';
      csvContent += '573007654321,ANA LOPEZ,45,10732469,3,carlos.ruiz@ngsoabogados.com,carlos.ruiz@ngsoabogados.com';
    } else if (template?.id === 'contacto_inicial') {
      csvContent += '573001234567,JUAN PEREZ,10732468,maria.garcia@ngsoabogados.com,maria.garcia@ngsoabogados.com\n';
      csvContent += '573007654321,ANA LOPEZ,10732469,carlos.ruiz@ngsoabogados.com,carlos.ruiz@ngsoabogados.com';
    } else {
      csvContent += '573001234567,Juan Pérez,10732468,María García,,agente1@ngsoabogados.com\n';
      csvContent += '573007654321,Ana López,10732469,Carlos Ruiz,,agente2@ngsoabogados.com';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plantilla_envio_masivo_${template?.id || 'ejemplo'}.csv`;
    link.click();
  };

  const getMessagePreview = (recipient: { phone: string; variables: Record<string, string> }) => {
    const template = WHATSAPP_TEMPLATES.find(t => t.sid === selectedTemplate);
    if (!template) return '';
    
    let preview = template.preview;
    Object.entries(recipient.variables).forEach(([key, value]) => {
      preview = preview.replaceAll(`{{${key}}}`, value || `[{{${key}}}]`);
    });
    return preview;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              📱 Envío Masivo de Mensajes WhatsApp
            </Typography>
            <Button
              variant="contained"
              startIcon={<Assessment />}
              onClick={() => navigate('/mass-campaigns/stats')}
              color="info"
            >
              Ver Estadísticas
            </Button>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Instrucciones:</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  1. Seleccione la plantilla de WhatsApp aprobada que desea enviar<br />
                  2. Configure el ritmo de envío para respetar los límites de Meta<br />
                  3. Descargue el archivo CSV de ejemplo con el formato correcto<br />
                  4. Complete el CSV con los números de teléfono y variables<br />
                  5. Suba el archivo y valide que no tenga errores<br />
                  6. Revise el preview de mensajes antes de enviar<br />
                  7. Envíe la campaña masiva
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Nombre de campaña */}
                <TextField
                  label="Nombre de la Campaña *"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  fullWidth
                  placeholder="Ej: Recordatorio Pago Diciembre 2024"
                />

                {/* Descripción */}
                <TextField
                  label="Descripción (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Descripción breve de esta campaña..."
                />

                {/* Selección de plantilla */}
                <FormControl fullWidth>
                  <InputLabel>Plantilla de WhatsApp *</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Plantilla de WhatsApp *"
                  >
                    {WHATSAPP_TEMPLATES.map((template) => (
                      <MenuItem key={template.sid} value={template.sid}>
                        {template.name} ({template.variables} variables)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Configuración de Rate Limiting */}
                {selectedTemplate && (
                  <Card variant="outlined" sx={{ bgcolor: 'info.lighter', borderColor: 'info.main' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        ⚙️ Configuración de Envío
                      </Typography>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="caption">
                          <strong>Límites de Meta WhatsApp:</strong> Ajuste estos valores según su tier de mensajería.
                          Tier 1: 1,000 msg/día | Tier 2: 10,000 msg/día | Tier 3: 100,000 msg/día
                        </Typography>
                      </Alert>
                      
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                          label="Mensajes por lote"
                          type="number"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                          helperText="Cantidad de mensajes enviados simultáneamente (1-50)"
                          sx={{ flex: 1, minWidth: 200 }}
                          InputProps={{ inputProps: { min: 1, max: 50 } }}
                        />
                        <TextField
                          label="Delay entre lotes (ms)"
                          type="number"
                          value={messageDelay}
                          onChange={(e) => setMessageDelay(Math.max(100, parseInt(e.target.value) || 1000))}
                          helperText="Pausa entre lotes en milisegundos (min: 100ms)"
                          sx={{ flex: 1, minWidth: 200 }}
                          InputProps={{ inputProps: { min: 100, step: 100 } }}
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          📊 <strong>Estimación:</strong> {validation ? `${validation.recipientCount} mensajes` : '0 mensajes'} • 
                          Tiempo aprox: {validation ? `${Math.ceil((validation.recipientCount / batchSize) * (messageDelay / 1000))} segundos` : '0s'} • 
                          Velocidad: {Math.round((batchSize / (messageDelay / 1000)) * 60)} msg/min
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Botón para descargar plantilla CSV */}
                {selectedTemplate && (
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={downloadSampleCsv}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Descargar Plantilla CSV
                  </Button>
                )}

                {/* Upload de archivo */}
                <Box>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUpload />}
                    sx={{ mr: 2 }}
                  >
                    {file ? 'Cambiar archivo CSV' : 'Seleccionar archivo CSV'}
                    <input type="file" hidden accept=".csv" onChange={handleFileChange} />
                  </Button>
                  
                  {file && (
                    <Chip
                      label={file.name}
                      onDelete={() => {
                        setFile(null);
                        setValidation(null);
                      }}
                      color="primary"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>

                {/* Botón de validación */}
                {file && !validation && (
                  <Button
                    variant="outlined"
                    startIcon={loading ? <CircularProgress size={20} /> : <Visibility />}
                    onClick={validateFile}
                    disabled={loading}
                  >
                    {loading ? 'Validando...' : 'Validar archivo CSV'}
                  </Button>
                )}

                {/* Errores generales */}
                {error && (
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {/* Resultado de validación */}
                {validation && (
                  <Card variant="outlined" sx={{ bgcolor: validation.valid ? 'success.lighter' : 'error.lighter' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        📋 Resultado de Validación
                      </Typography>
                      
                      {validation.valid ? (
                        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                          ✓ Archivo válido: <strong>{validation.recipientCount} destinatarios</strong> listos para enviar
                        </Alert>
                      ) : (
                        <Alert severity="error" icon={<Error />} sx={{ mb: 2 }}>
                          ✗ Se encontraron {validation.errors.length} errores
                        </Alert>
                      )}

                      {validation.errors.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="error" gutterBottom>
                            Errores encontrados:
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {validation.errors.map((err, idx) => (
                                <li key={idx}>
                                  <Typography variant="body2" color="error">{err}</Typography>
                                </li>
                              ))}
                            </ul>
                          </Paper>
                        </Box>
                      )}

                      {validation.preview.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            👁️ Vista previa de mensajes (primeros 5):
                          </Typography>
                          
                          {validation.preview.map((recipient, idx) => (
                            <Card key={idx} variant="outlined" sx={{ mb: 2, bgcolor: 'grey.50' }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Chip 
                                    label={`📱 ${recipient.phone}`} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Mensaje #{idx + 1}
                                  </Typography>
                                </Box>
                                
                                <Paper 
                                  sx={{ 
                                    p: 2, 
                                    bgcolor: '#DCF8C6', 
                                    borderRadius: 2,
                                    border: '1px solid #ccc',
                                    position: 'relative',
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      right: -10,
                                      top: 10,
                                      width: 0,
                                      height: 0,
                                      borderLeft: '10px solid #DCF8C6',
                                      borderTop: '10px solid transparent',
                                      borderBottom: '10px solid transparent',
                                    }
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      whiteSpace: 'pre-wrap', 
                                      fontFamily: 'system-ui',
                                      fontSize: '0.875rem',
                                      lineHeight: 1.5
                                    }}
                                  >
                                    {getMessagePreview(recipient)}
                                  </Typography>
                                </Paper>
                                
                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {Object.entries(recipient.variables).map(([key, value]) => (
                                    <Chip
                                      key={key}
                                      label={`{{${key}}}: ${value}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {validation.recipientCount > 5 && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                              ... y {validation.recipientCount - 5} mensajes más con el mismo formato
                            </Alert>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Botón de envío */}
                {validation && validation.valid && !sending && !result && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<Send />}
                    onClick={sendCampaign}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Enviar Campaña ({validation.recipientCount} mensajes)
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Progreso de envío */}
          {sending && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  📤 Enviando campaña...
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {sendingStatus}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {currentProgress} de {validation?.recipientCount || 0}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(currentProgress / (validation?.recipientCount || 1)) * 100} 
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                
                <Alert severity="info">
                  Por favor espere. Los mensajes se están enviando en lotes para respetar los límites de Meta WhatsApp.
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Resultado final */}
          {result && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {result.success ? '✅' : '⚠️'} Campaña Completada: {result.campaignName || 'Sin nombre'}
                </Typography>
                
                {result.message ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {result.message}
                    {result.recipientCount && ` (${result.recipientCount} destinatarios, ~${result.estimatedDuration}s)`}
                  </Alert>
                ) : result.success ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✓ Campaña enviada exitosamente
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠ La campaña se completó con algunos errores
                  </Alert>
                )}

                {result.total !== undefined && (
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography variant="h4" color="info.main">{result.total}</Typography>
                        </CardContent>
                      </Card>
                      <Card variant="outlined" sx={{ bgcolor: 'success.lighter' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Enviados ✓</Typography>
                          <Typography variant="h4" color="success.main">{result.sent || 0}</Typography>
                        </CardContent>
                      </Card>
                      <Card variant="outlined" sx={{ bgcolor: 'error.lighter' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Fallidos ✗</Typography>
                          <Typography variant="h4" color="error.main">{result.failed || 0}</Typography>
                        </CardContent>
                      </Card>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Tasa de éxito</Typography>
                          <Typography variant="h4" color="primary.main">
                            {result.sent && result.total ? ((result.sent / result.total) * 100).toFixed(1) : 0}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>

                    {result.errors && result.errors.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          ❌ Errores de envío ({result.errors.length}):
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Error</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.errors.map((err, idx) => (
                                <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                                  <TableCell>
                                    <Chip label={err.phone} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" color="error">
                                      {err.error}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip label="Fallido" size="small" color="error" />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}
