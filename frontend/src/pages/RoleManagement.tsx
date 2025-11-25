// Role Management - NGS&O CRM Gestión
// Gestión de roles y permisos del sistema
// Desarrollado por: Alejandro Sandoval - AS Software

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import api from '../services/api';

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

interface GroupedPermissions {
  [module: string]: Permission[];
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);
      
      setRoles(rolesRes.data.data || rolesRes.data);
      setPermissions(permissionsRes.data.data || permissionsRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    const permissionIds = new Set(role.permissions.map(p => p.id));
    setSelectedPermissions(permissionIds);
    setEditDialogOpen(true);
  };

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleToggleModule = (modulePermissions: Permission[]) => {
    const moduleIds = modulePermissions.map(p => p.id);
    const allSelected = moduleIds.every(id => selectedPermissions.has(id));
    
    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      // Deseleccionar todos del módulo
      moduleIds.forEach(id => newSelected.delete(id));
    } else {
      // Seleccionar todos del módulo
      moduleIds.forEach(id => newSelected.add(id));
    }
    setSelectedPermissions(newSelected);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      // Obtener permisos actuales del rol
      const currentPermissionIds = new Set(selectedRole.permissions.map(p => p.id));
      
      // Determinar qué permisos agregar y cuáles eliminar
      const toAdd = Array.from(selectedPermissions).filter(id => !currentPermissionIds.has(id));
      const toRemove = Array.from(currentPermissionIds).filter(id => !selectedPermissions.has(id));

      // Agregar nuevos permisos (en batch)
      if (toAdd.length > 0) {
        await api.post(`/roles/${selectedRole.id}/permissions`, { permissionIds: toAdd });
      }

      // Eliminar permisos removidos (en batch)
      if (toRemove.length > 0) {
        await api.delete(`/roles/${selectedRole.id}/permissions`, { 
          data: { permissionIds: toRemove }
        });
      }

      setEditDialogOpen(false);
      await loadData();
      alert('Permisos actualizados exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al actualizar permisos');
    } finally {
      setSaving(false);
    }
  };

  const groupPermissionsByModule = (): GroupedPermissions => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as GroupedPermissions);
  };

  const getModuleIcon = (module: string): string => {
    const icons: { [key: string]: string } = {
      users: '👥',
      roles: '🔐',
      chats: '💬',
      messages: '✉️',
      clients: '👤',
      campaigns: '📢',
      tasks: '📋',
      reports: '📊',
      whatsapp: '📱',
      audit: '📝',
      system: '⚙️',
    };
    return icons[module] || '📦';
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    const colors: { [key: string]: any } = {
      read: 'primary',
      create: 'success',
      update: 'warning',
      delete: 'error',
      send: 'info',
    };
    return colors[action] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <ModernSidebar />
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
          <AppHeader />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <CircularProgress />
          </Box>
        </Box>
      </Box>
    );
  }

  const groupedPermissions = groupPermissionsByModule();

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Gestión de Roles y Permisos
            </Typography>
          </Box>

          {/* Info Alert */}
          <Alert severity="info" sx={{ mb: 3 }}>
            Los permisos controlan qué acciones puede realizar cada rol en el sistema. 
            El rol <strong>Super Admin</strong> siempre tiene todos los permisos.
          </Alert>

          {/* Roles Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Roles del Sistema
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rol</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="center">Permisos Asignados</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <Typography fontWeight="bold">{role.name}</Typography>
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${role.permissions.length} permisos`}
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Editar permisos">
                            <IconButton
                              color="primary"
                              onClick={() => handleEditRole(role)}
                              disabled={role.name === 'Super Admin'}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Edit Permissions Dialog */}
          <Dialog 
            open={editDialogOpen} 
            onClose={() => !saving && setEditDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Editar Permisos: {selectedRole?.name}
            </DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Cambiar permisos afectará inmediatamente a todos los usuarios con este rol.
              </Alert>

              <Typography variant="body2" color="textSecondary" mb={2}>
                {selectedRole?.description}
              </Typography>

              <Typography variant="subtitle2" mb={2}>
                Permisos seleccionados: {selectedPermissions.size} de {permissions.length}
              </Typography>

              {/* Permissions by Module */}
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                const allSelected = modulePermissions.every(p => selectedPermissions.has(p.id));
                const someSelected = modulePermissions.some(p => selectedPermissions.has(p.id));

                return (
                  <Accordion key={module}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" width="100%">
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onChange={() => handleToggleModule(modulePermissions)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Typography sx={{ ml: 1 }}>
                          {getModuleIcon(module)} {module.toUpperCase()}
                        </Typography>
                        <Chip
                          label={`${modulePermissions.filter(p => selectedPermissions.has(p.id)).length}/${modulePermissions.length}`}
                          size="small"
                          sx={{ ml: 2 }}
                          color={allSelected ? 'success' : someSelected ? 'warning' : 'default'}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        {modulePermissions.map((permission) => (
                          <Box key={permission.id} display="flex" alignItems="center" mb={1}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedPermissions.has(permission.id)}
                                  onChange={() => handleTogglePermission(permission.id)}
                                />
                              }
                              label={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip 
                                    label={permission.action}
                                    size="small"
                                    color={getActionColor(permission.action)}
                                  />
                                  <Typography variant="body2">
                                    {permission.description}
                                  </Typography>
                                </Box>
                              }
                            />
                          </Box>
                        ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSavePermissions}
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
