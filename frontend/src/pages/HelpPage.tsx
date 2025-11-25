// Help Page - NGS&O CRM Gestión
// Centro de ayuda y soporte

import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Help as HelpIcon,
  VideoLibrary as VideoIcon,
  Description as DocsIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

export default function HelpPage() {
  const [sidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      question: '¿Cómo inicio sesión en el sistema?',
      answer: 'Ingresa tu correo electrónico y contraseña en la página de inicio de sesión. Si olvidaste tu contraseña, haz clic en "Recuperar contraseña".',
    },
    {
      question: '¿Cómo creo una nueva campaña?',
      answer: 'Ve a la sección de Campañas y haz clic en el botón "Nueva Campaña". Completa el formulario con el nombre, descripción y fechas de inicio/fin.',
    },
    {
      question: '¿Cómo asigno un chat a un agente?',
      answer: 'En la vista de Chats, selecciona el chat deseado y usa la opción "Asignar a" para elegir el agente responsable.',
    },
    {
      question: '¿Cómo veo los reportes?',
      answer: 'Accede a la sección de Reportes desde el menú lateral. Podrás filtrar por fecha y ver estadísticas detalladas.',
    },
    {
      question: '¿Qué roles existen en el sistema?',
      answer: 'El sistema cuenta con tres roles: Administrador (acceso completo), Supervisor (gestión de chats y agentes) y Agente (atención de chats asignados).',
    },
    {
      question: '¿Cómo configuro WhatsApp?',
      answer: 'Los administradores pueden configurar números de WhatsApp en la sección de Configuración. Se generará un código QR para vincular el número.',
    },
    {
      question: '¿Cómo cambio mi contraseña?',
      answer: 'Ve a Configuración > Perfil y selecciona "Cambiar contraseña". Deberás ingresar tu contraseña actual y la nueva contraseña dos veces.',
    },
    {
      question: '¿Cómo exporto reportes?',
      answer: 'En la página de Reportes, usa el botón "Exportar" para descargar los datos en formato Excel o PDF.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Centro de Ayuda
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Encuentra respuestas a tus preguntas y aprende a usar el sistema
          </Typography>
          <TextField
            fullWidth
            placeholder="Buscar en la ayuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 600, mx: 'auto' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          <Box>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <VideoIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Tutoriales en Video
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Aprende con guías paso a paso en video
                </Typography>
                <Button variant="outlined" size="small">
                  Ver Videos
                </Button>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <DocsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Documentación
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Guías detalladas y referencias técnicas
                </Typography>
                <Button variant="outlined" size="small">
                  Leer Docs
                </Button>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <ChatIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Soporte en Vivo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Chatea con nuestro equipo de soporte
                </Typography>
                <Button variant="outlined" size="small">
                  Iniciar Chat
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* FAQs */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Preguntas Frecuentes
        </Typography>
        {filteredFaqs.map((faq, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HelpIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography sx={{ fontWeight: 500 }}>{faq.question}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{faq.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Contact */}
        <Card sx={{ mt: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600, mb: 3, textAlign: 'center' }}>
              ¿No encuentras lo que buscas?
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box>
                <Box sx={{ textAlign: 'center' }}>
                  <EmailIcon sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    soporte@ngso.com
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ textAlign: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Teléfono
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    +1 (555) 123-4567
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ textAlign: 'center' }}>
                  <ChatIcon sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Horario
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    Lun-Vie: 9:00 - 18:00
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
        </Box>
      </Box>
    </Box>
  );
}
