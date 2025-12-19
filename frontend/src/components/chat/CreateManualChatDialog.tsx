// CreateManualChatDialog - NGS&O CRM Gestión
// Permite al agente crear un chat manual con un número de teléfono
// Incluye selección de plantillas de WhatsApp aprobadas
// Admin/Supervisor pueden asignar a un agente específico
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect, useCallback } from 'react';
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Card,
  CardContent,
} from '@mui/material';
import { 
  Phone, 
  Person, 
  PersonSearch, 
  History, 
  ExpandMore, 
  ExpandLess,
  Assignment,
  CheckCircle,
  Message,
  Send,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/redux';
import apiService from '../../services/api';

// Definición de plantillas aprobadas de Twilio
const WHATSAPP_TEMPLATES = [
  {
    id: 'contacto_inicial',
    sid: 'HX87f380266edfc0d2c150932e7c716d16',
    name: 'Contacto Inicial',
    description: 'Primer contacto con el cliente',
    category: 'general',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '3', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., se comunica con usted respecto a su contrato de arrendamiento.\n\n📋 Solicitud: {{2}}\n\nQueremos brindarle información importante. Por favor responda a este mensaje para continuar la conversación.\n\nAtentamente,\n{{3}}\nNGS&O Abogados',
  },
  {
    id: 'vigente_aviso_1',
    sid: 'HX53a51112ac3e59f30a17e17c382bb361',
    name: 'Vigente - Aviso 1',
    description: 'Primer aviso para clientes vigentes',
    category: 'vigentes',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '3', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que tiene valores pendientes en el pago de los cánones correspondientes a su contrato de arrendamiento.\n\n📋 Solicitud: {{2}}\n\nLe invitamos a regularizar su situación. Solicite su link de pago respondiendo a este mensaje y con gusto le asistimos.\n\nSi tiene alguna dificultad, cuéntenos para buscar alternativas.\n\nAtentamente,\n{{3}}\nNGS&O Abogados',
  },
  {
    id: 'vigente_aviso_2',
    sid: 'HX0bb45dfd6b84d0c66db9b684035c74b1',
    name: 'Vigente - Aviso 2',
    description: 'Segundo aviso para clientes vigentes',
    category: 'vigentes',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Días de mora', placeholder: '30' },
      { key: '3', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '4', label: 'Días restantes', placeholder: '5' },
      { key: '5', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que presenta un saldo pendiente de más de {{2}} días en el pago de los cánones de su contrato de arrendamiento.\n\n📋 Solicitud: {{3}}\n\nEs importante regularizar su situación para evitar inconvenientes. Le invitamos a solicitar su link de pago en los próximos {{4}} días respondiendo a este mensaje.\n\nAtentamente,\n{{5}}\nNGS&O Abogados',
  },
  {
    id: 'vigente_aviso_3',
    sid: 'HXbec9cc11ba19ca9015fa7863089990b3',
    name: 'Vigente - Aviso 3',
    description: 'Tercer aviso para clientes vigentes',
    category: 'vigentes',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Valor pendiente', placeholder: '$500,000' },
      { key: '3', label: 'Inmueble', placeholder: 'CR 89 80 52 BG' },
      { key: '4', label: 'Arrendador', placeholder: 'Grupo Inmobiliario Kapital' },
    ],
    preview: 'Estimado(a) {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le contacta con información importante sobre su contrato de arrendamiento.\n\n💰 Valor pendiente: {{2}}\n🏠 Inmueble: {{3}}\n🏢 Arrendador: {{4}}\n\nEs necesario que nos contacte en los próximos días para revisar su situación y brindarle opciones de solución.\n\nEstamos para ayudarle.\n\nAtentamente,\nNGS&O Abogados',
  },
  {
    id: 'desocupado_aviso_1',
    sid: 'HX9265068e47eeaa825cc6323100a9cd37',
    name: 'Desocupado - Aviso 1',
    description: 'Primer aviso para clientes desocupados',
    category: 'desocupados',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '3', label: 'Arrendador', placeholder: 'Grupo Inmobiliario Kapital' },
      { key: '4', label: 'Fecha límite descuento', placeholder: '31 de diciembre' },
      { key: '5', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Señor(a) {{1}}\n\nASUNTO: ¡Oportunidad para regularizar su situación! - Solicitud: {{2}}\n\nCordial saludo.\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le reitera la invitación al pago de la obligación pendiente por cánones del contrato de arrendamiento con {{3}}.\n\n🎉 Lo invitamos a acogerse a nuestra campaña de descuentos vigente hasta el {{4}}.\n\nPara conocer su beneficio y realizar el pago, comuníquese con {{5}}:\n📞 (601) 4320170 – opción 4\n📱 333 0334068 – opción 4\n\nSi ya realizó el pago, haga caso omiso. ¡Gracias!',
  },
  {
    id: 'desocupado_aviso_2',
    sid: 'HX6b5e9513116d798f4c3037df0a632f1f',
    name: 'Desocupado - Aviso 2',
    description: 'Segundo aviso para clientes desocupados',
    category: 'desocupados',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Arrendador', placeholder: 'Grupo Inmobiliario Kapital' },
      { key: '3', label: 'Inmueble', placeholder: 'CR 89 80 52 BG' },
      { key: '4', label: 'Ciudad', placeholder: 'Bogotá' },
      { key: '5', label: 'Solicitud / ID', placeholder: '10732468' },
    ],
    preview: 'Cordial saludo,\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., solicita la atención de {{1}} respecto a valores pendientes del contrato de arrendamiento con {{2}}.\n\n🏠 Inmueble: {{3}}\n📍 Ciudad: {{4}}\n\nQueremos ayudarle a encontrar una solución. Si lo desea, podemos llamarle para explicarle las alternativas disponibles.\n\n📞 (601) 4320170 – opción 4\n📱 333 0334068 – opción 4\n\nResponda a este mensaje si prefiere que le llamemos.\n\n📋 Solicitud: {{5}}\n\nAtentamente,\nNGS&O Abogados',
  },
  {
    id: 'desistido_aviso_1',
    sid: 'HXb8a3b111a30e4800e703788602edd25e',
    name: 'Desistido - Aviso 1',
    description: 'Primer aviso para clientes desistidos',
    category: 'desistidos',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Periodo pendiente', placeholder: 'noviembre 2024' },
      { key: '3', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '4', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que la inmobiliaria ha reportado un saldo pendiente en el pago del canon de arrendamiento correspondiente al periodo de {{2}}.\n\n📋 Solicitud: {{3}}\n\nPara regularizar su situación, le invitamos a realizar el pago directamente a la inmobiliaria y enviar el soporte por este medio.\n\nSi ya realizó el pago, por favor haga caso omiso.\n\nAtentamente,\n{{4}}\nNGS&O Abogados',
  },
  {
    id: 'desistido_aviso_3',
    sid: 'HXdd3a892fcfb888ee6515e1fdcab30db4',
    name: 'Desistido - Aviso 3',
    description: 'Tercer aviso para clientes desistidos',
    category: 'desistidos',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '3', label: 'Fecha límite', placeholder: '20 de diciembre' },
      { key: '4', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que los cánones de arrendamiento continúan pendientes.\n\n📋 Solicitud: {{2}}\n\nLe recordamos que tiene plazo hasta el {{3}} para regularizar su situación directamente con la inmobiliaria. Después de esta fecha, su caso pasará a otra instancia de gestión.\n\nPor favor realice el pago y envíe el soporte por este medio o al correo ellibertador@ngsoabogados.com\n\nAtentamente,\n{{4}}\nNGS&O Abogados',
  },
  {
    id: 'copy_desistido_aviso_2',
    sid: 'HX5dba8fa1980232522f42477eea34d4a8',
    name: 'Desistido - Aviso 2',
    description: 'Segundo aviso para clientes desistidos',
    category: 'desistidos',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Periodo pendiente', placeholder: 'noviembre 2024' },
      { key: '3', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '4', label: 'Fecha límite', placeholder: '20 de diciembre' },
      { key: '5', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que a la fecha no se ha registrado el pago de los cánones de arrendamiento correspondientes a {{2}}.\n\n📋 Solicitud: {{3}}\n\nEs importante que nos contacte antes del {{4}} para encontrar la mejor solución y evitar inconvenientes adicionales.\n\nPara regularizar su situación, realice el pago directamente a la inmobiliaria y envíe el soporte por este medio.\n\nAtentamente,\n{{5}}\nNGS&O Abogados',
  },
  {
    id: 'confirmacion_pago',
    sid: 'HXeb7d072ea5a5e23b973b05129d64f596',
    name: 'Confirmación de Pago',
    description: 'Confirmación de recepción de pago',
    category: 'general',
    variables: [
      { key: '1', label: 'Nombre del cliente', placeholder: 'Juan Pérez' },
      { key: '2', label: 'Solicitud / ID', placeholder: '10732468' },
      { key: '3', label: 'Valor recibido', placeholder: '$500,000' },
      { key: '4', label: 'Fecha de pago', placeholder: '18 de diciembre' },
      { key: '5', label: 'Nombre del asesor', placeholder: 'María García' },
    ],
    preview: 'Cordial saludo {{1}},\n\nNGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., confirma la recepción de su pago.\n\n📋 Solicitud: {{2}}\n💰 Valor recibido: {{3}}\n📅 Fecha: {{4}}\n\nGracias por regularizar su situación. Si tiene alguna consulta adicional, estamos para servirle.\n\nAtentamente,\n{{5}}\nNGS&O Abogados',
  },
];

interface TicketHistory {
  ticketNumber: string;
  closedAt: string;
  typification: string;
  typificationCategory: string;
  agentName: string;
  campaignName: string;
}

interface PreviousAgent {
  id: string;
  name: string;
  email: string;
}

interface ClientHistory {
  previousAgent: PreviousAgent | null;
  ticketHistory: TicketHistory[];
  totalChats: number;
  uniqueClient: boolean;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  state: string;
}

interface CreateManualChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chat: any) => void;
}

export default function CreateManualChatDialog({
  open,
  onClose,
  onChatCreated,
}: CreateManualChatDialogProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para funcionalidad de admin/supervisor
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  // Estados para plantillas
  const [selectedTemplate, setSelectedTemplate] = useState<typeof WHATSAPP_TEMPLATES[0] | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // Determinar si el usuario puede asignar a otros agentes
  const canAssignToOthers = ['Super Admin', 'Administrador', 'Supervisor'].includes(user?.role?.name || '');

  // Reset form al abrir el diálogo
  useEffect(() => {
    if (open) {
      setPhone('');
      setContactName('');
      setError(null);
      setSuccess(null);
      setClientHistory(null);
      setSelectedAgentId('');
      setShowHistory(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    }
  }, [open]);

  // Cargar agentes disponibles si el usuario puede asignar
  useEffect(() => {
    if (open && canAssignToOthers) {
      loadAvailableAgents();
    }
  }, [open, canAssignToOthers]);

  const loadAvailableAgents = async () => {
    setLoadingAgents(true);
    try {
      const response = await apiService.get('/users/agents');
      const agents = response.data.filter((a: Agent) => 
        a.state === 'available' || a.state === 'busy'
      );
      setAvailableAgents(agents);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Buscar historial del cliente cuando se ingresa un teléfono válido
  const fetchClientHistory = useCallback(async (phoneNumber: string) => {
    if (phoneNumber.length < 10) {
      setClientHistory(null);
      return;
    }

    setLoadingHistory(true);
    try {
      const response = await apiService.get(`/chats/client-history/${phoneNumber}`);
      const history = response.data.data as ClientHistory;
      setClientHistory(history);
      
      // Si hay agente previo y el usuario puede asignar, preseleccionarlo
      if (history.previousAgent && canAssignToOthers) {
        setSelectedAgentId(history.previousAgent.id);
      }
    } catch (err) {
      console.error('Error fetching client history:', err);
      setClientHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [canAssignToOthers]);

  // Debounce para buscar historial
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone.length >= 10) {
        fetchClientHistory(phone);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, fetchClientHistory]);

  const handlePhoneChange = (value: string) => {
    // Solo permitir números
    const cleaned = value.replace(/\D/g, '');
    setPhone(cleaned);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setTemplateVariables({});
      return;
    }
    const template = WHATSAPP_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      // Inicializar variables vacías
      const vars: Record<string, string> = {};
      template.variables.forEach(v => {
        vars[v.key] = '';
      });
      setTemplateVariables(vars);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const validatePhone = () => {
    if (!phone) return 'El número de teléfono es requerido';
    if (phone.length < 10) return 'El número debe tener al menos 10 dígitos';
    if (phone.length > 15) return 'El número no puede tener más de 15 dígitos';
    return null;
  };

  const validateTemplate = () => {
    if (!selectedTemplate) return null; // Template es opcional
    for (const variable of selectedTemplate.variables) {
      if (!templateVariables[variable.key]?.trim()) {
        return `El campo "${variable.label}" es requerido para la plantilla`;
      }
    }
    return null;
  };

  const getPreviewWithVariables = () => {
    if (!selectedTemplate) return '';
    let preview = selectedTemplate.preview;
    Object.entries(templateVariables).forEach(([key, value]) => {
      const displayValue = value || `[{{${key}}}]`;
      // Usar replaceAll para reemplazar todas las ocurrencias
      preview = preview.replaceAll(`{{${key}}}`, displayValue);
    });
    return preview;
  };

  const handleSubmit = async () => {
    // Validaciones
    const phoneError = validatePhone();
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const templateError = validateTemplate();
    if (templateError) {
      setError(templateError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        phone,
        contactName: contactName || undefined,
      };

      // Si el usuario puede asignar y seleccionó un agente
      if (canAssignToOthers && selectedAgentId) {
        payload.assignToAgentId = selectedAgentId;
      }

      // Si se seleccionó una plantilla
      if (selectedTemplate) {
        payload.templateSid = selectedTemplate.sid;
        payload.templateVariables = templateVariables;
      }

      const response = await apiService.post('/chats/manual', payload);

      const successMessage = response.data.data?.templateSent 
        ? '✅ Chat creado y plantilla enviada exitosamente'
        : response.data.message;

      setSuccess(successMessage);

      // Notificar al componente padre
      setTimeout(() => {
        onChatCreated(response.data.data.chat);
        onClose();
      }, 1500);

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al crear el chat';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar plantillas por categoría
  const groupedTemplates = WHATSAPP_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof WHATSAPP_TEMPLATES>);

  const categoryLabels: Record<string, string> = {
    general: '📋 General',
    desocupados: '🏠 Desocupados',
    desistidos: '❌ Desistidos',
    vigentes: '✅ Vigentes',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Phone color="primary" />
          <Typography variant="h6">Iniciar Nuevo Chat con Plantilla</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" icon={<CheckCircle />}>
              {success}
            </Alert>
          )}

          <TextField
            label="Número de Teléfono"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="573001234567"
            required
            fullWidth
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone />
                </InputAdornment>
              ),
              endAdornment: loadingHistory ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null,
            }}
            helperText="Ingrese el número en formato internacional (ej: 573001234567)"
          />

          <TextField
            label="Nombre del Contacto (opcional)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Juan Pérez"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />

          {/* Sección de Plantilla */}
          <Divider sx={{ my: 1 }}>
            <Chip label="Seleccionar Plantilla WhatsApp" size="small" icon={<Message />} />
          </Divider>

          <FormControl fullWidth>
            <InputLabel>Plantilla a enviar</InputLabel>
            <Select
              value={selectedTemplate?.id || ''}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              label="Plantilla a enviar"
            >
              <MenuItem value="">
                <em>Sin plantilla (crear chat sin mensaje)</em>
              </MenuItem>
              {Object.entries(groupedTemplates).map(([category, templates]) => [
                <MenuItem key={`cat-${category}`} disabled sx={{ fontWeight: 'bold', opacity: 1 }}>
                  {categoryLabels[category] || category}
                </MenuItem>,
                ...templates.map((template) => (
                  <MenuItem key={template.id} value={template.id} sx={{ pl: 4 }}>
                    <Box>
                      <Typography variant="body2">{template.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          {/* Campos de variables de la plantilla */}
          {selectedTemplate && (
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment fontSize="small" />
                  Variables de la plantilla: {selectedTemplate.name}
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {selectedTemplate.variables.map((variable) => (
                    <TextField
                      key={variable.key}
                      label={variable.label}
                      value={templateVariables[variable.key] || ''}
                      onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                      placeholder={variable.placeholder}
                      fullWidth
                      required
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Chip label={`{{${variable.key}}}`} size="small" variant="outlined" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  ))}
                </Box>

                {/* Vista previa del mensaje */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    📱 Vista previa del mensaje que se enviará:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#DCF8C6', borderRadius: 2, border: '1px solid #ccc' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'system-ui' }}>
                      {getPreviewWithVariables()}
                    </Typography>
                  </Paper>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      <strong>Template ID:</strong> {selectedTemplate.sid}
                      <br />
                      Las variables marcadas con dobles llaves aún necesitan ser completadas.
                    </Typography>
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Mostrar información del cliente si existe historial */}
          {clientHistory && clientHistory.totalChats > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonSearch color="warning" />
                  <Typography variant="subtitle2" color="warning.main">
                    Cliente Recurrente - {clientHistory.totalChats} chats anteriores
                  </Typography>
                </Box>
                <Chip
                  label={clientHistory.uniqueClient ? 'Cliente único' : 'Múltiples interacciones'}
                  size="small"
                  color={clientHistory.uniqueClient ? 'success' : 'info'}
                />
              </Box>

              {clientHistory.previousAgent && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>Último agente que lo atendió:</strong> {clientHistory.previousAgent.name}
                    <br />
                    <em>Se recomienda asignar al mismo agente para continuidad.</em>
                  </Typography>
                </Alert>
              )}

              {/* Botón para mostrar/ocultar historial de tickets */}
              {clientHistory.ticketHistory.length > 0 && (
                <>
                  <Button
                    size="small"
                    onClick={() => setShowHistory(!showHistory)}
                    startIcon={<History />}
                    endIcon={showHistory ? <ExpandLess /> : <ExpandMore />}
                    sx={{ mt: 1 }}
                  >
                    Ver historial de tickets ({clientHistory.ticketHistory.length})
                  </Button>

                  <Collapse in={showHistory}>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                      {clientHistory.ticketHistory.map((ticket, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Assignment fontSize="small" color="action" />
                                <Typography variant="body2" fontWeight="bold">
                                  Ticket: {ticket.ticketNumber}
                                </Typography>
                                <Chip 
                                  label={ticket.typification} 
                                  size="small" 
                                  variant="outlined"
                                  color={ticket.typification.includes('Pagado') ? 'success' : 'default'}
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" display="block">
                                  Categoría: {ticket.typificationCategory}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Atendido por: {ticket.agentName} | {formatDate(ticket.closedAt)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              )}
            </Paper>
          )}

          {/* Selector de agente solo para admin/supervisor */}
          {canAssignToOthers && (
            <>
              <Divider sx={{ my: 1 }}>
                <Chip label="Asignación de Agente" size="small" />
              </Divider>

              <FormControl fullWidth>
                <InputLabel>Asignar a Agente</InputLabel>
                <Select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  label="Asignar a Agente"
                  disabled={loadingAgents}
                  startAdornment={
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">
                    <em>Auto-asignar (agente actual o previo)</em>
                  </MenuItem>
                  {availableAgents.map((agent) => (
                    <MenuItem 
                      key={agent.id} 
                      value={agent.id}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {agent.firstName} {agent.lastName}
                        {clientHistory?.previousAgent?.id === agent.id && (
                          <Chip 
                            label="Atendió antes" 
                            size="small" 
                            color="primary" 
                            icon={<CheckCircle />}
                          />
                        )}
                      </Box>
                      <Chip 
                        label={agent.state === 'available' ? 'Disponible' : 'Ocupado'} 
                        size="small" 
                        color={agent.state === 'available' ? 'success' : 'warning'}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Como {user?.role?.name}, puede asignar el chat a cualquier agente disponible.
                {clientHistory?.previousAgent && ' Se recomienda el agente que lo atendió anteriormente.'}
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !phone}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          color={selectedTemplate ? 'success' : 'primary'}
        >
          {loading ? 'Enviando...' : selectedTemplate ? 'Crear Chat y Enviar Plantilla' : 'Crear Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
