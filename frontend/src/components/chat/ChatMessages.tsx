// Chat Messages - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import { Send, SmartToy, Person, Download, Receipt, Psychology, Edit, Save, Close } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchMessages, sendMessage, addMessage } from '../../store/slices/messagesSlice';
import { socketService } from '../../services/socket.service';
import type { Chat, Message } from '../../types/index';
import { formatTimeOnly, getInitials } from '../../utils/helpers';
import api from '../../services/api';

interface ChatMessagesProps {
  chat: Chat;
}

export default function ChatMessages({ chat }: ChatMessagesProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { items: messagesMap, isSending, isLoading } = useAppSelector((state) => state.messages);
  const messages = messagesMap[chat.id] || [];
  
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados para el modal de evidencia
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Estados para paz y salvo
  const [pazYSalvo, setPazYSalvo] = useState<any>(null);
  const [pazYSalvoAvailable, setPazYSalvoAvailable] = useState(false);
  const [pazYSalvoMessage, setPazYSalvoMessage] = useState('');
  const [downloadingPazYSalvo, setDownloadingPazYSalvo] = useState(false);

  // Estado para transferir al bot
  const [transferringToBot, setTransferringToBot] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');

  // Estado para editar información del contacto
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactName, setEditContactName] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Detectar si el usuario es Supervisor o Super Admin (modo solo lectura)
  const isReadOnly = user?.role?.name === 'Supervisor' || user?.role?.name === 'Super Admin';

  useEffect(() => {
    // Cargar mensajes del chat
    dispatch(fetchMessages(chat.id));

    // Unirse al room del chat para recibir eventos en tiempo real
    socketService.joinChatRoom(chat.id);

    // Escuchar nuevos mensajes
    const unsubscribe = socketService.onMessageReceived((event) => {
      if (event.chatId === chat.id) {
        console.log('✅ [ChatMessages] Nuevo mensaje recibido:', event.message);
        dispatch(addMessage(event.message));
      }
    });

    // Verificar disponibilidad de paz y salvo si el cliente está pagado
    if (chat.client?.id && chat.client?.collectionStatus === 'paid') {
      checkPazYSalvoAvailability();
    }

    return () => {
      unsubscribe();
      // Salir del room cuando se cierra el chat
      socketService.leaveChatRoom(chat.id);
    };
  }, [chat.id, chat.client?.id, chat.client?.collectionStatus, dispatch]);

  useEffect(() => {
    // Auto-scroll al último mensaje
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (messageText.trim() === '' || isSending) return;

    const text = messageText;
    setMessageText('');
    
    await dispatch(sendMessage({ chatId: chat.id, content: text }));
    scrollToBottom();
  };

  const checkPazYSalvoAvailability = async () => {
    try {
      const response = await api.get(`/paz-y-salvo/check/${chat.client?.id}`);
      const result = response.data?.data?.data || response.data?.data;
      
      setPazYSalvoAvailable(result.isAvailable || false);
      setPazYSalvoMessage(result.message || '');
      setPazYSalvo(result.pazYSalvo || null);
    } catch (error) {
      console.error('Error verificando paz y salvo:', error);
    }
  };

  const handleOpenTransferDialog = () => {
    setTransferDialogOpen(true);
  };

  const handleCloseTransferDialog = () => {
    setTransferDialogOpen(false);
    setTransferReason('');
  };

  // Funciones para editar información del contacto
  const handleStartEditContact = () => {
    setEditContactName(chat.contactName || chat.contactPhone || '');
    setIsEditingContact(true);
  };

  const handleCancelEditContact = () => {
    setIsEditingContact(false);
    setEditContactName('');
  };

  const handleSaveContact = async () => {
    if (!editContactName.trim()) {
      setSnackbar({ 
        open: true, 
        message: '⚠️ El nombre no puede estar vacío', 
        severity: 'error' 
      });
      return;
    }

    try {
      setSavingContact(true);
      
      await api.patch(`/chats/${chat.id}/contact`, { 
        contactName: editContactName.trim()
      });
      
      // Actualizar localmente el chat
      chat.contactName = editContactName.trim();
      
      setSnackbar({ 
        open: true, 
        message: '✅ Nombre del contacto actualizado', 
        severity: 'success' 
      });
      
      setIsEditingContact(false);
    } catch (error: any) {
      console.error('Error actualizando contacto:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Error al actualizar el contacto', 
        severity: 'error' 
      });
    } finally {
      setSavingContact(false);
    }
  };

  const handleTransferToBot = async () => {
    if (!transferReason.trim()) {
      setSnackbar({ 
        open: true, 
        message: '⚠️ Debe indicar el motivo de la transferencia', 
        severity: 'error' 
      });
      return;
    }

    try {
      setTransferringToBot(true);
      
      // Desasignar el chat con el motivo - el backend se encargará de cerrarlo y generar PDF
      await api.patch(`/chats/${chat.id}/assign`, { 
        agentId: null,
        reason: transferReason 
      });
      
      setSnackbar({ 
        open: true, 
        message: '✅ Chat transferido al bot exitosamente', 
        severity: 'success' 
      });
      
      handleCloseTransferDialog();
      
      // Redirigir al workspace después de 1 segundo
      setTimeout(() => {
        window.location.href = '/workspace';
      }, 1000);
    } catch (error: any) {
      console.error('Error transfiriendo al bot:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Error al transferir el chat al bot', 
        severity: 'error' 
      });
    } finally {
      setTransferringToBot(false);
    }
  };

  const handleDownloadPazYSalvo = async () => {
    if (!chat.client?.id) return;

    try {
      setDownloadingPazYSalvo(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/paz-y-salvo/download/${chat.client.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al descargar el paz y salvo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Paz-y-Salvo-${chat.client.fullName || 'Cliente'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSnackbar({ open: true, message: '✅ Paz y salvo descargado exitosamente', severity: 'success' });
      
      // Actualizar estado después de descargar
      await checkPazYSalvoAvailability();
    } catch (error: any) {
      console.error('Error descargando paz y salvo:', error);
      setSnackbar({ open: true, message: error.message || 'Error al descargar el paz y salvo', severity: 'error' });
    } finally {
      setDownloadingPazYSalvo(false);
    }
  };

  const handleDownloadMedia = async (message: Message) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/messages/${message.id}/download-media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.mediaFileName || 'archivo';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando archivo:', error);
    }
  };

  const handleMarkAsEvidence = (message: Message) => {
    setSelectedMessage(message);
    setPaymentAmount(chat.client?.debtAmount?.toString() || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setEvidenceDialogOpen(true);
  };

  const handleCloseEvidenceDialog = () => {
    setEvidenceDialogOpen(false);
    setSelectedMessage(null);
    setPaymentAmount('');
    setNotes('');
  };

  const handleSubmitEvidence = async () => {
    if (!selectedMessage || !paymentAmount || !paymentDate || !chat.client?.id) {
      setSnackbar({ open: true, message: 'Por favor completa todos los campos requeridos', severity: 'error' });
      return;
    }

    try {
      setUploading(true);

      // Descargar la imagen primero
      const token = localStorage.getItem('accessToken');
      const imageResponse = await fetch(
        `${import.meta.env.VITE_SOCKET_URL}${selectedMessage.mediaUrl}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!imageResponse.ok) {
        throw new Error('Error al obtener la imagen');
      }

      const blob = await imageResponse.blob();
      const fileName = selectedMessage.mediaFileName || 'evidencia.jpg';
      const file = new File([blob], fileName, { type: blob.type });

      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', chat.client.id);
      formData.append('paymentAmount', paymentAmount);
      formData.append('paymentDate', paymentDate);
      if (notes) formData.append('notes', notes);

      // Subir evidencia
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payment-evidences/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la evidencia');
      }

      setSnackbar({ 
        open: true, 
        message: '✅ Evidencia de pago registrada exitosamente', 
        severity: 'success' 
      });
      handleCloseEvidenceDialog();
    } catch (error) {
      console.error('Error al subir evidencia:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error al registrar la evidencia', 
        severity: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const getSenderIcon = (message: Message) => {
    switch (message.senderType) {
      case 'client':
        return <Person />;
      case 'bot':
        return <SmartToy />;
      case 'agent':
        return user ? (
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
            {getInitials(`${user.firstName} ${user.lastName}`)}
          </Avatar>
        ) : (
          <Person />
        );
      default:
        return <Person />;
    }
  };

  const isMyMessage = (message: Message) => {
    return message.direction === 'outbound' && message.senderType === 'agent';
  };

  const isBotMessage = (message: Message) => {
    return message.senderType === 'bot';
  };

  const clientName =
    chat.contactName ||
    chat.client?.fullName ||
    chat.client?.name ||
    chat.contactPhone ||
    'Sin datos del cliente';
  const clientPhone = chat.contactPhone || chat.client?.phone || 'Teléfono no disponible';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del chat */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            {isEditingContact ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  placeholder="Nombre del contacto"
                  size="small"
                  autoFocus
                  sx={{ minWidth: 200 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveContact();
                    if (e.key === 'Escape') handleCancelEditContact();
                  }}
                />
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={handleSaveContact}
                  disabled={savingContact}
                >
                  {savingContact ? <CircularProgress size={20} /> : <Save />}
                </IconButton>
                <IconButton 
                  size="small" 
                  color="default" 
                  onClick={handleCancelEditContact}
                  disabled={savingContact}
                >
                  <Close />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">{clientName}</Typography>
                {!isReadOnly && (
                  <Tooltip title="Editar nombre del contacto">
                    <IconButton size="small" onClick={handleStartEditContact}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              {clientPhone}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Botón para transferir al bot */}
            {!isReadOnly && chat.assignedAgent && (
              <Tooltip title="Transferir este chat de vuelta al bot">
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Psychology />}
                  onClick={handleOpenTransferDialog}
                  disabled={transferringToBot}
                  size="small"
                >
                  {transferringToBot ? (
                    <CircularProgress size={20} />
                  ) : (
                    'Transferir al Bot'
                  )}
                </Button>
              </Tooltip>
            )}
            
            {/* Botón de Paz y Salvo */}
            {chat.client?.collectionStatus === 'paid' && (
              <Tooltip title={pazYSalvoMessage}>
                <span>
                  <Button
                    variant={pazYSalvoAvailable ? 'contained' : 'outlined'}
                    color={pazYSalvoAvailable ? 'success' : 'warning'}
                    startIcon={<Receipt />}
                    onClick={handleDownloadPazYSalvo}
                    disabled={!pazYSalvoAvailable || downloadingPazYSalvo}
                    size="small"
                  >
                    {downloadingPazYSalvo ? (
                      <CircularProgress size={20} />
                    ) : pazYSalvoAvailable ? (
                      'Descargar Paz y Salvo'
                    ) : (
                      pazYSalvoMessage.includes('días') ? 
                        `Disponible en ${pazYSalvo?.daysRemaining || 'X'} día(s)` : 
                        'Paz y Salvo'
                    )}
                  </Button>
                </span>
              </Tooltip>
            )}
            {isReadOnly && (
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                  🔍 MODO SUPERVISIÓN
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Área de mensajes */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: '#f5f5f5',
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <CircularProgress size={24} sx={{ mr: 2 }} />
            Cargando mensajes...
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            No hay mensajes en este chat todavía.
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isMyMessage(message) ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              {/* Avatar para mensajes entrantes */}
              {!isMyMessage(message) && (
                <Box sx={{ mr: 1 }}>
                  {getSenderIcon(message)}
                </Box>
              )}

              {/* Burbuja de mensaje */}
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  backgroundColor: isBotMessage(message) 
                    ? '#e3f2fd' 
                    : isMyMessage(message) 
                    ? '#dcf8c6' 
                    : 'white',
                  borderRadius: 2,
                  borderTopRightRadius: isMyMessage(message) ? 0 : 2,
                  borderTopLeftRadius: isMyMessage(message) || isBotMessage(message) ? 2 : 0,
                  border: isBotMessage(message) ? '1px solid #2196f3' : 'none',
                }}
              >
                {/* Indicador de bot */}
                {message.senderType === 'bot' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <SmartToy sx={{ fontSize: 14, mr: 0.5, color: 'primary.main' }} />
                    <Typography variant="caption" color="primary" fontWeight="bold">
                      Bot Automático
                    </Typography>
                  </Box>
                )}

                {/* Contenido del mensaje según tipo */}
                {message.type === 'image' && message.mediaUrl ? (
                  <Box>
                    <img 
                      src={`${import.meta.env.VITE_SOCKET_URL}${message.mediaUrl}`}
                      alt={message.mediaFileName || 'Imagen'}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: '8px',
                        display: 'block',
                        marginBottom: '8px'
                      }}
                      onError={(e) => {
                        console.error('Error cargando imagen:', message.mediaUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {message.content && message.content !== '[IMAGE]' && (
                      <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                        {message.content}
                      </Typography>
                    )}
                    {/* Botones de acción para imágenes del cliente */}
                    {!isMyMessage(message) && message.senderType === 'client' && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Descargar imagen">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => handleDownloadMedia(message)}
                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                          >
                            Descargar
                          </Button>
                        </Tooltip>
                        <Tooltip title="Marcar como evidencia de pago">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<Receipt />}
                            onClick={() => handleMarkAsEvidence(message)}
                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                          >
                            Evidencia
                          </Button>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                ) : message.type === 'audio' && message.mediaUrl ? (
                  <Box>
                    <audio 
                      controls 
                      style={{ maxWidth: '100%' }}
                      preload="metadata"
                    >
                      <source src={`${import.meta.env.VITE_SOCKET_URL}${message.mediaUrl}`} type={message.mediaMimeType || 'audio/ogg'} />
                      Tu navegador no soporta audio.
                    </audio>
                    {message.content && message.content !== '[AUDIO]' && message.content !== '[PTT]' && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {message.content}
                      </Typography>
                    )}
                  </Box>
                ) : message.type === 'video' && message.mediaUrl ? (
                  <Box>
                    <video 
                      controls 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: '8px' 
                      }}
                    >
                      <source src={`${import.meta.env.VITE_SOCKET_URL}${message.mediaUrl}`} type={message.mediaMimeType || 'video/mp4'} />
                      Tu navegador no soporta video.
                    </video>
                    {message.content && message.content !== '[VIDEO]' && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {message.content}
                      </Typography>
                    )}
                  </Box>
                ) : message.type === 'document' && message.mediaUrl ? (
                  <Box>
                    <a 
                      href={message.mediaUrl} 
                      download={message.mediaFileName}
                      style={{ 
                        color: isMyMessage(message) ? '#075e54' : '#1976d2',
                        textDecoration: 'none',
                        fontWeight: 'bold'
                      }}
                    >
                      📄 {message.mediaFileName || 'Documento'}
                    </a>
                    {message.content && message.content !== '[DOCUMENT]' && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {message.content}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimeOnly(message.createdAt)}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input de mensaje */}
      <Paper
        component="form"
        onSubmit={handleSendMessage}
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={isReadOnly ? "Modo supervisión - Solo lectura" : "Escribe un mensaje..."}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          disabled={isSending || chat.status === 'closed' || isReadOnly}
          sx={{ mr: 1 }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={messageText.trim() === '' || isSending || chat.status === 'closed' || isReadOnly}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&.Mui-disabled': {
              backgroundColor: 'action.disabledBackground',
            },
          }}
        >
          {isSending ? <CircularProgress size={24} /> : <Send />}
        </IconButton>
      </Paper>

      {/* Modal para registrar evidencia de pago */}
      <Dialog 
        open={evidenceDialogOpen} 
        onClose={handleCloseEvidenceDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          📋 Registrar Evidencia de Pago
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedMessage?.mediaUrl && (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <img 
                  src={`${import.meta.env.VITE_SOCKET_URL}${selectedMessage.mediaUrl}`}
                  alt="Evidencia"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0'
                  }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="Monto del Pago"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              helperText="Ingresa el monto total del pago"
            />

            <TextField
              fullWidth
              label="Fecha del Pago"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notas (opcional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pago recibido por transferencia bancaria, referencia #123456"
              helperText="Agrega detalles adicionales sobre el pago"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Esta evidencia quedará registrada en el sistema y será enviada a los supervisores para su revisión.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseEvidenceDialog}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitEvidence}
            variant="contained"
            color="success"
            disabled={uploading || !paymentAmount || !paymentDate}
            startIcon={uploading ? <CircularProgress size={20} /> : <Receipt />}
          >
            {uploading ? 'Registrando...' : 'Registrar Evidencia'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para confirmar transferencia al bot */}
      <Dialog 
        open={transferDialogOpen} 
        onClose={handleCloseTransferDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          🤖 Transferir Chat al Bot
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Al transferir este chat al bot, se cerrará la conversación y se generará un PDF de cierre automáticamente.
            </Alert>

            <TextField
              fullWidth
              label="Motivo de la Transferencia"
              multiline
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              required
              placeholder="Ej: Cliente no responde, Cliente solicita información del bot, etc."
              helperText="Debe indicar obligatoriamente el motivo de la transferencia"
              error={transferReason.trim() === ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseTransferDialog}
            disabled={transferringToBot}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleTransferToBot}
            variant="contained"
            color="secondary"
            disabled={transferringToBot || !transferReason.trim()}
            startIcon={transferringToBot ? <CircularProgress size={20} /> : <Psychology />}
          >
            {transferringToBot ? 'Transfiriendo...' : 'Confirmar Transferencia'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
