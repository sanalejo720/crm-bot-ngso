/**
 * NotificationSettings Component
 * Configuración de notificaciones de sonido y visuales
 * Desarrollado por: Alejandro Sandoval - AS Software
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  Slider,
  Button,
  FormControlLabel,
  Box,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import notificationService from '../../services/notification.service';

const NotificationSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Cargar configuración actual
    setEnabled(notificationService.isNotificationsEnabled());
    setVolume(notificationService.getVolume());
    
    // Verificar permisos del navegador
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleToggleEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = event.target.checked;
    setEnabled(newEnabled);
    notificationService.setEnabled(newEnabled);
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const newVolume = newValue as number;
    setVolume(newVolume);
    notificationService.setVolume(newVolume);
  };

  const handleTestNotification = () => {
    notificationService.testNotification();
  };

  const handleRequestPermission = async () => {
    const permission = await notificationService.requestPermission();
    setBrowserPermission(permission);
  };

  const getPermissionStatus = () => {
    switch (browserPermission) {
      case 'granted':
        return { text: 'Concedido', color: 'success' as const };
      case 'denied':
        return { text: 'Denegado', color: 'error' as const };
      default:
        return { text: 'No solicitado', color: 'default' as const };
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {enabled ? (
            <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
          ) : (
            <NotificationsOffIcon sx={{ mr: 1, color: 'text.disabled' }} />
          )}
          <Typography variant="h6">Notificaciones</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Las notificaciones te alertarán cuando lleguen nuevos mensajes o se te asignen chats.
        </Alert>

        {/* Switch principal */}
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={handleToggleEnabled}
              color="primary"
            />
          }
          label="Habilitar notificaciones de sonido"
        />

        <Divider sx={{ my: 3 }} />

        {/* Control de volumen */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <VolumeUpIcon sx={{ mr: 1, color: enabled ? 'primary.main' : 'text.disabled' }} />
            <Typography variant="body2" color={enabled ? 'text.primary' : 'text.disabled'}>
              Volumen: {Math.round(volume * 100)}%
            </Typography>
          </Box>
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.1}
            disabled={!enabled}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Permisos del navegador */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Notificaciones del navegador
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              label={getPermissionStatus().text}
              color={getPermissionStatus().color}
              size="small"
            />
            {browserPermission !== 'granted' && (
              <Button
                size="small"
                variant="outlined"
                onClick={handleRequestPermission}
                disabled={browserPermission === 'denied'}
              >
                Solicitar permiso
              </Button>
            )}
          </Box>
          {browserPermission === 'denied' && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Has denegado los permisos. Para habilitarlos, debes cambiar la configuración de tu navegador.
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Botón de prueba */}
        <Button
          variant="contained"
          onClick={handleTestNotification}
          disabled={!enabled}
          fullWidth
        >
          Probar notificación
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Nota: El sonido solo se reproducirá si has interactuado previamente con la página.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
