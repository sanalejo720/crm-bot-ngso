// Debug Component - NGS&O CRM Gestión
// Para diagnosticar problemas de autenticación y carga de datos

import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography, Alert } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchMyChats } from '../store/slices/chatsSlice';
import apiService from '../services/api';

export default function DebugPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { items: chats, isLoading, error } = useAppSelector((state) => state.chats);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    console.log('=== DEBUG PAGE MOUNTED ===');
    console.log('User:', user);
    console.log('IsAuthenticated:', isAuthenticated);
    console.log('LocalStorage accessToken:', !!localStorage.getItem('accessToken'));
    console.log('LocalStorage user:', localStorage.getItem('user'));
  }, [user, isAuthenticated]);

  const testDirectApiCall = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      setTestResult(`Token presente: ${!!token}\n`);
      
      if (token) {
        setTestResult(prev => prev + `Token (20 chars): ${token.substring(0, 20)}...\n`);
      }
      
      const response = await apiService.get('/chats/my-chats');
      setTestResult(prev => prev + `\nResponse status: ${response.status}\n`);
      setTestResult(prev => prev + `Response.data keys: ${Object.keys(response.data).join(', ')}\n`);
      setTestResult(prev => prev + `Response.data.data length: ${response.data.data?.length || 0}\n`);
      setTestResult(prev => prev + `\nSuccess! ✅\n`);
      setTestResult(prev => prev + JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setTestResult(`Error: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`);
    }
  };

  const testReduxThunk = () => {
    dispatch(fetchMyChats({}));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Debug Page
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Estado de Autenticación
        </Typography>
        <Typography>Usuario: {(user as any)?.fullName || 'No autenticado'}</Typography>
        <Typography>Email: {user?.email || '-'}</Typography>
        <Typography>IsAuthenticated: {isAuthenticated ? 'Sí' : 'No'}</Typography>
        <Typography>Token en localStorage: {localStorage.getItem('accessToken') ? 'Presente' : 'Ausente'}</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Estado de Redux (chats)
        </Typography>
        <Typography>Chats cargados: {chats.length}</Typography>
        <Typography>isLoading: {isLoading ? 'Sí' : 'No'}</Typography>
        <Typography>Error: {error || 'Ninguno'}</Typography>
        
        {chats.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Chats:</Typography>
            {chats.map(chat => (
              <Typography key={chat.id} variant="body2">
                - {(chat as any).contactName} ({chat.status})
              </Typography>
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pruebas
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" onClick={testDirectApiCall}>
            Test Llamada Directa API
          </Button>
          <Button variant="contained" onClick={testReduxThunk}>
            Test Redux Thunk
          </Button>
        </Box>

        {testResult && (
          <Alert severity="info">
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{testResult}</pre>
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
