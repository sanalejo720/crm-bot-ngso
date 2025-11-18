// App Header - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Menu, MenuItem, Chip } from '@mui/material';
import { Logout, AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout, updateAgentState } from '../../store/slices/authSlice';
import { socketService } from '../../services/socket.service';
import { getInitials } from '../../utils/helpers';
import type { AgentState } from '../../types/index';

export default function AppHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStatusMenu = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchor(event.currentTarget);
  };

  const handleStatusClose = () => {
    setStatusAnchor(null);
  };

  const handleChangeStatus = (newState: AgentState) => {
    dispatch(updateAgentState(newState));
    socketService.changeAgentState(newState);
    handleStatusClose();
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const getStatusColor = (state?: AgentState) => {
    switch (state) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'in-break': return 'info';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (state?: AgentState) => {
    switch (state) {
      case 'available': return 'Disponible';
      case 'busy': return 'Ocupado';
      case 'in-break': return 'En descanso';
      case 'offline': return 'Desconectado';
      default: return 'Sin estado';
    }
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

        {/* Estado del agente */}
        {user?.isAgent && (
          <Chip
            label={getStatusLabel(user.agentState)}
            color={getStatusColor(user.agentState)}
            size="small"
            onClick={handleStatusMenu}
            sx={{ mr: 2, cursor: 'pointer' }}
          />
        )}

        {/* Menú de estado */}
        <Menu
          anchorEl={statusAnchor}
          open={Boolean(statusAnchor)}
          onClose={handleStatusClose}
        >
          <MenuItem onClick={() => handleChangeStatus('available')}>
            <Chip label="Disponible" color="success" size="small" sx={{ mr: 1 }} />
          </MenuItem>
          <MenuItem onClick={() => handleChangeStatus('busy')}>
            <Chip label="Ocupado" color="warning" size="small" sx={{ mr: 1 }} />
          </MenuItem>
          <MenuItem onClick={() => handleChangeStatus('in-break')}>
            <Chip label="En descanso" color="info" size="small" sx={{ mr: 1 }} />
          </MenuItem>
          <MenuItem onClick={() => handleChangeStatus('offline')}>
            <Chip label="Desconectado" color="default" size="small" sx={{ mr: 1 }} />
          </MenuItem>
        </Menu>

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
