// Home Page - NGS&O CRM Gestión
// Redirige al usuario según su rol
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppSelector } from '../hooks/redux';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const role = user.role?.name;

    // Redirigir según el rol
    switch (role) {
      case 'Agente':
        navigate('/workspace');
        break;
      case 'Supervisor':
      case 'Administrador':
      case 'SuperAdmin':
        navigate('/all-chats');
        break;
      default:
        navigate('/workspace');
    }
  }, [user, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default HomePage;
