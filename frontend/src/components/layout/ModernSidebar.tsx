// Modern Sidebar - Inspired by Greeva Template
// Responsive sidebar with smooth animations and modern design

import { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  Chat,
  People,
  Assessment,
  Settings,
  Campaign,
  ChevronLeft,
  ChevronRight,
  Notifications,
  Help,
  WhatsApp,
  TextSnippet,
  MonitorHeart,
  Security,
  AttachMoney,
  SmartToy,
  Receipt,
  Backup,
  PersonSearch,
  Lock,
  Event,
  EventNote,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { getInitials } from '../../utils/helpers';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 80;

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  badge?: number;
}

const menuItems: MenuItem[] = [
  // 📊 DASHBOARDS
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'my-dashboard',
    label: 'Mi Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    roles: ['Agente'],
  },
  {
    id: 'financial',
    label: 'Dashboard Financiero',
    icon: <AttachMoney />,
    path: '/financial',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },

  // 💬 GESTIÓN DE CHATS
  {
    id: 'workspace',
    label: 'Mis Chats',
    icon: <Chat />,
    path: '/workspace',
    roles: ['Agente'],
  },
  {
    id: 'all-chats',
    label: 'Todos los Chats',
    icon: <WhatsApp />,
    path: '/all-chats',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'templates',
    label: 'Plantillas',
    icon: <TextSnippet />,
    path: '/templates',
    roles: ['Supervisor', 'Administrador', 'Super Admin', 'Agente'],
  },

  // 💰 GESTIÓN FINANCIERA
  {
    id: 'payment-evidences',
    label: 'Evidencias de Pago',
    icon: <Receipt />,
    path: '/payment-evidences',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'evidences-pdf',
    label: 'PDFs de Cierre',
    icon: <Lock />,
    path: '/evidences',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'payment-promises',
    label: 'Promesas de Pago',
    icon: <Event />,
    path: '/payment-promises',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
    {
      id: 'unidentified-clients',
      label: 'Clientes No Identificados',
      icon: <PersonSearch />,
      path: '/unidentified-clients',
      roles: ['Supervisor', 'Administrador', 'Super Admin'],
    },
  {
    id: 'reports',
    label: 'Reportes',
    icon: <Assessment />,
    path: '/reports',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },

  // 📢 CAMPAÑAS Y OPERACIONES
  {
    id: 'campaigns',
    label: 'Campañas',
    icon: <Campaign />,
    path: '/campaigns',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'debtors',
    label: 'Base de Deudores',
    icon: <People />,
    path: '/debtors',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'bot-flows',
    label: 'Flujos de Bot',
    icon: <SmartToy />,
    path: '/bot-flows',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },

  // 🔧 CONFIGURACIÓN Y SISTEMA
  {
    id: 'whatsapp',
    label: 'Números WhatsApp',
    icon: <WhatsApp />,
    path: '/whatsapp',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'monitoring',
    label: 'Monitoreo Sesiones',
    icon: <MonitorHeart />,
    path: '/monitoring',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'attendance',
    label: 'Control Asistencia',
    icon: <EventNote />,
    path: '/attendance',
    roles: ['Supervisor', 'Administrador', 'Super Admin'],
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: <People />,
    path: '/users',
    roles: ['Administrador', 'Super Admin'],
  },
  {
    id: 'roles',
    label: 'Roles y Permisos',
    icon: <Security />,
    path: '/roles',
    roles: ['Administrador', 'Super Admin'],
  },

  // 🔒 ADMINISTRACIÓN IT
  {
    id: 'backups',
    label: 'Backups IT',
    icon: <Backup />,
    path: '/backups',
    roles: ['Super Admin'],
  },
];

const bottomMenuItems: MenuItem[] = [
  {
    id: 'help',
    label: 'Ayuda',
    icon: <Help />,
    path: '/help',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: <Settings />,
    path: '/settings',
  },
];

interface ModernSidebarProps {
  open?: boolean;
  onClose?: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

export default function ModernSidebar({
  open = true,
  onClose,
  variant = 'permanent',
}: ModernSidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [collapsed, setCollapsed] = useState(false);

  const hasRole = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(user?.role.name || '');
  };

  const filteredMenuItems = menuItems.filter((item) => hasRole(item.roles));
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
          : '#ffffff',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 80,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 4px 12px rgba(255, 107, 53, 0.4)',
              }}
            >
              <WhatsApp sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                NGS&O
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                CRM Gestión
              </Typography>
            </Box>
          </Box>
        )}
        
        {!isMobile && (
          <IconButton
            onClick={toggleCollapse}
            size="small"
            sx={{
              backgroundColor: 'action.hover',
              '&:hover': { backgroundColor: 'action.selected' },
            }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* User Info */}
      {!collapsed && (
        <Box
          sx={{
            p: 2,
            mx: 2,
            mt: 2,
            borderRadius: 2,
            background: theme.palette.mode === 'dark'
              ? 'rgba(74, 85, 104, 0.1)'
              : 'rgba(74, 85, 104, 0.05)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(74, 85, 104, 0.2)'
              : 'rgba(74, 85, 104, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                fontWeight: 600,
              }}
            >
              {getInitials(user?.firstName || user?.email || 'User')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.firstName || user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                }}
              >
                {user?.role.name}
              </Typography>
            </Box>
            <IconButton size="small">
              <Badge badgeContent={3} color="error">
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Main Menu */}
      <List sx={{ flex: 1, px: 2, py: 2 }}>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Tooltip
              key={item.id}
              title={collapsed ? item.label : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mb: 0.5,
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 0 : 2,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a4093 100%)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: '#fff',
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'rgba(99, 102, 241, 0.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    color: isActive ? '#fff' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />

      {/* Bottom Menu */}
      <List sx={{ px: 2, py: 2 }}>
        {bottomMenuItems.map((item) => (
          <Tooltip
            key={item.id}
            title={collapsed ? item.label : ''}
            placement="right"
            arrow
          >
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 0 : 2,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  color: 'text.secondary',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant={variant}
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
}
