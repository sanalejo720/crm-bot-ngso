// Users Management - NGS&O CRM Gestión
// Panel de administración de usuarios y roles
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Edit,
  Delete,
  PersonAdd,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import apiService from '../services/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isAgent: boolean;
  status: string;
  role: {
    id: string;
    name: string;
  };
  currentChatsCount?: number;
  maxConcurrentChats?: number;
  agentState?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function UsersManagement() {
  const [sidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    isAgent: false,
    maxConcurrentChats: 5,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        apiService.get('/users'),
        apiService.get('/roles'),
      ]);
      
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        email: user.email,
        password: '',
        phone: user.phone || '',
        roleId: user.role.id,
        isAgent: user.isAgent,
        maxConcurrentChats: user.maxConcurrentChats || 5,
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        roleId: '',
        isAgent: false,
        maxConcurrentChats: 5,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // Actualizar usuario
        await apiService.patch(`/users/${editingUser.id}`, formData);
      } else {
        // Crear usuario
        await apiService.post('/users', formData);
      }
      
      handleCloseDialog();
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    
    try {
      await apiService.delete(`/users/${userId}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getAgentStateLabel = (state?: string) => {
    switch (state) {
      case 'available': return 'Disponible';
      case 'busy': return 'Ocupado';
      case 'in-break': return 'En descanso';
      case 'offline': return 'Desconectado';
      default: return 'N/A';
    }
  };

  const getAgentStateColor = (state?: string) => {
    switch (state) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'in-break': return 'info';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748', mb: 1 }}>
                Gestión de Usuarios
              </Typography>
              <Typography variant="body1" sx={{ color: '#718096' }}>
                Administra usuarios, roles y permisos del sistema
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e55a2b 0%, #d94f23 100%)',
                },
              }}
            >
              Nuevo Usuario
            </Button>
          </Box>

          {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f7fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Usuario</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#4a5568' }}>Rol</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Tipo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Estado</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Estado Agente</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Chats</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4a5568' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {user.fullName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {user.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role.name} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      {user.isAgent ? (
                        <Chip label="Agente" size="small" color="success" />
                      ) : (
                        <Chip label="Administrativo" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={user.status}
                        size="small"
                        color={getStatusColor(user.status)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {user.isAgent ? (
                        <Chip
                          label={getAgentStateLabel(user.agentState)}
                          size="small"
                          color={getAgentStateColor(user.agentState)}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {user.isAgent && user.currentChatsCount !== undefined ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.currentChatsCount}/{user.maxConcurrentChats}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(user.currentChatsCount / (user.maxConcurrentChats || 1)) * 100}
                            color={user.currentChatsCount >= (user.maxConcurrentChats || 0) ? 'error' : 'success'}
                            sx={{ width: 60, height: 4 }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        No hay usuarios registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nombre completo"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              disabled={!!editingUser}
            />
            
            {!editingUser && (
              <TextField
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
              />
            )}
            
            <TextField
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            
            <TextField
              select
              label="Rol"
              value={formData.roleId}
              onChange={(e) => {
                const selectedRole = roles.find(r => r.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  roleId: e.target.value,
                  isAgent: selectedRole?.name === 'Agente' || selectedRole?.name === 'Supervisor'
                });
              }}
              fullWidth
              required
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>
            
            {formData.isAgent && (
              <TextField
                label="Máximo de chats concurrentes"
                type="number"
                value={formData.maxConcurrentChats}
                onChange={(e) => setFormData({ ...formData, maxConcurrentChats: parseInt(e.target.value) || 5 })}
                fullWidth
                inputProps={{ min: 1, max: 20 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ color: '#718096' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.fullName || !formData.email || !formData.roleId || (!editingUser && !formData.password)}
            sx={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e55a2b 0%, #d94f23 100%)',
              },
            }}
          >
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
