// Login Page - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, WhatsApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login, verify2FA } from '../store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, requires2FA } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    
    const result = await dispatch(login({ email, password }));
    
    if (login.fulfilled.match(result) && !result.payload.requires2FA) {
      navigate('/');
    }
  };

  const handle2FA = async (e: FormEvent) => {
    e.preventDefault();
    
    const result = await dispatch(verify2FA(twoFactorCode));
    
    if (verify2FA.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', boxShadow: 6 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo NGS&O */}
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: 3,
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            }}
          >
            <img 
              src="/ngso-logo.svg" 
              alt="NGS&O Logo" 
              style={{ width: '100%', maxWidth: '280px' }}
            />
          </Box>

          {/* Título */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <WhatsApp sx={{ fontSize: 50, color: '#25D366', mb: 1 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#1a237e' }}>
              CRM Gestión de Cobranzas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sistema Profesional con WhatsApp
            </Typography>
            
            {/* Logo AS Software */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Desarrollado por
              </Typography>
              <img 
                src="/as-software-logo.svg" 
                alt="AS Software" 
                style={{ height: '20px' }}
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!requires2FA ? (
            // Formulario de login
            <form onSubmit={handleLogin}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                autoFocus
                autoComplete="email"
              />

              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d47a1 0%, #01579b 100%)',
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Iniciar Sesión'}
              </Button>
            </form>
          ) : (
            // Formulario 2FA
            <form onSubmit={handle2FA}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Ingresa el código de verificación de tu aplicación de autenticación
              </Alert>

              <TextField
                label="Código 2FA"
                fullWidth
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                sx={{ mb: 3 }}
                autoFocus
                inputProps={{
                  maxLength: 6,
                  pattern: '[0-9]*',
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading || twoFactorCode.length !== 6}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d47a1 0%, #01579b 100%)',
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verificar'}
              </Button>
            </form>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            textAlign="center"
            sx={{ mt: 3 }}
          >
            v1.0.0 - Noviembre 2025
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
