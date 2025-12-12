// App Header - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Menu, MenuItem } from '@mui/material';
import { Logout, AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { getInitials } from '../../utils/helpers';
import WorkdayHeaderControls from '../workday/WorkdayHeaderControls';

export default function AppHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Toolbar>
        {/* Logo NGS&O */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
          <img 
            src="/ngso-logo.svg" 
            alt="NGS&O" 
            style={{ height: '40px', marginRight: '12px' }}
          />
        </Box>

        {/* Título del sistema */}
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
          CRM Gestión
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Controles de jornada laboral y estado para agentes */}
        {(user?.isAgent || user?.role?.name === 'Agente') && <WorkdayHeaderControls />}

        {/* Avatar y menú de usuario */}
        <Box>
          <IconButton onClick={handleMenu} color="inherit">
            {user?.avatar ? (
              <Avatar src={user.avatar} alt={user.firstName} />
            ) : (
              <Avatar>{user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}</Avatar>
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <AccountCircle sx={{ mr: 1 }} />
              {user?.firstName} {user?.lastName}
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                {user?.role?.name}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
