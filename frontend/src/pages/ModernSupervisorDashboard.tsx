// Modern Supervisor Dashboard - NGS&O CRM Gestión
// Dashboard moderno para supervisores con diseño Greeva
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Tabs, Tab } from '@mui/material';
import {
  People,
  Chat,
  AttachMoney,
  HourglassEmpty,
  TrendingUp,
  CheckCircle,
  Visibility,
  Assignment,
  Dashboard as DashboardIcon,
  Groups,
} from '@mui/icons-material';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';
import StatsCard from '../components/common/StatsCard';
import ChatCard from '../components/common/ChatCard';
import AgentMonitoring from '../components/workday/AgentMonitoring';
import apiService from '../services/api';
import { useAppSelector } from '../hooks/redux';

interface DashboardStats {
  totalAgents: number;
  availableAgents: number;
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  resolvedChats: number;
  totalDebt: number;
  averageDebt: number;
}

interface RecentChat {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  assignedAgent: {
    fullName: string;
  } | null;
  lastMessageAt: string;
  campaignName?: string;
}

export default function ModernSupervisorDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [sidebarOpen] = useState(true);
  const [, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    availableAgents: 0,
    totalChats: 0,
    activeChats: 0,
    waitingChats: 0,
    resolvedChats: 0,
    totalDebt: 0,
    averageDebt: 0,
  });
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChat, setSelectedChat] = useState<RecentChat | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const agentsResponse = await apiService.get('/users', {
        params: { isAgent: true }
      });
      const agentsData = agentsResponse.data.data || [];

      const chatsResponse = await apiService.get('/chats');
      // La respuesta puede venir como { data: Chat[] } o { data: { data: Chat[], pagination: {...} } }
      const chatsRaw = chatsResponse.data.data;
      const chatsData = Array.isArray(chatsRaw) ? chatsRaw : (chatsRaw?.data || []);

      const activeChats = chatsData.filter((c: any) => c.status === 'active');
      const waitingChats = chatsData.filter((c: any) => c.status === 'waiting');
      const resolvedChats = chatsData.filter((c: any) => c.status === 'closed');
      const availableAgents = agentsData.filter((a: any) => a.agentState === 'Disponible');

      setStats({
        totalAgents: agentsData.length,
        availableAgents: availableAgents.length,
        totalChats: chatsData.length,
        activeChats: activeChats.length,
        waitingChats: waitingChats.length,
        resolvedChats: resolvedChats.length,
        totalDebt: 5000000,
        averageDebt: 5000000 / Math.max(chatsData.length, 1),
      });

      setRecentChats(chatsData.slice(0, 6));
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const handleChatMenuOpen = (event: React.MouseEvent, chat: RecentChat) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget as HTMLElement);
    setSelectedChat(chat);
  };

  const handleChatMenuClose = () => {
    setAnchorEl(null);
    setSelectedChat(null);
  };

  const handleViewChat = () => {
    if (selectedChat) {
      // Redirigir a AllChatsView con el filtro del chat específico
      navigate(`/all-chats?chatId=${selectedChat.id}`);
    }
    handleChatMenuClose();
  };

  const handleAssignChat = () => {
    if (selectedChat) {
      // Redirigir a AllChatsView con el diálogo de asignación abierto para ese chat
      navigate(`/all-chats?action=assign&chatId=${selectedChat.id}`);
    }
    handleChatMenuClose();
  };

  const handleOpenWhatsApp = () => {
    if (selectedChat) {
      // Abrir el chat dentro del CRM (redirigir al workspace con el chat específico)
      navigate(`/workspace?chatId=${selectedChat.id}`);
    }
    handleChatMenuClose();
  };

  const handleCardClick = (chat: RecentChat) => {
    // Al hacer click en la tarjeta, ver los detalles del chat específico
    navigate(`/all-chats?chatId=${chat.id}`);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <ModernSidebar open={sidebarOpen} />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        
        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Dashboard de Supervisión
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Bienvenido, {user?.firstName || user?.email}
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<DashboardIcon />} label="Vista General" iconPosition="start" />
            <Tab icon={<Groups />} label="Monitoreo de Agentes" iconPosition="start" />
          </Tabs>

          {/* Tab 0: Vista General */}
          {tabValue === 0 && (
          <>
          {/* Stats Cards Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <StatsCard
              title="Agentes Totales"
              value={stats.totalAgents.toString()}
              subtitle={`${stats.availableAgents} disponibles`}
              icon={<People />}
              trend={{ value: 0, isPositive: true }}
              color="primary"
            />
            <StatsCard
              title="Chats Totales"
              value={stats.totalChats.toString()}
              subtitle={`${stats.activeChats} activos`}
              icon={<Chat />}
              trend={{ value: 0, isPositive: true }}
              color="success"
            />
            <StatsCard
              title="En Cola"
              value={stats.waitingChats.toString()}
              subtitle="Esperando asignación"
              icon={<HourglassEmpty />}
              trend={{ value: 0, isPositive: false }}
              color="warning"
            />
            <StatsCard
              title="Deuda Total"
              value={`$${(stats.totalDebt / 1000000).toFixed(1)}M`}
              subtitle={`Promedio: $${(stats.averageDebt / 1000).toFixed(0)}K`}
              icon={<AttachMoney />}
              trend={{ value: 0, isPositive: true }}
              color="error"
            />
          </Box>

          {/* Secondary Stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <StatsCard
              title="Chats Activos"
              value={stats.activeChats.toString()}
              subtitle="En conversación"
              icon={<Chat />}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              progress={stats.totalChats > 0 ? (stats.activeChats / stats.totalChats) * 100 : 0}
            />
            <StatsCard
              title="Tasa de Resolución"
              value={stats.totalChats > 0 ? `${Math.round((stats.resolvedChats / stats.totalChats) * 100)}%` : '0%'}
              subtitle={`${stats.resolvedChats} resueltos`}
              icon={<CheckCircle />}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              progress={stats.totalChats > 0 ? (stats.resolvedChats / stats.totalChats) * 100 : 0}
            />
            <StatsCard
              title="Eficiencia"
              value="85%"
              subtitle="Promedio del equipo"
              icon={<TrendingUp />}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              progress={85}
            />
          </Box>

          {/* Recent Chats */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 3 }}>
              Chats Recientes
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 3,
              }}
            >
              {recentChats.map((chat) => (
                <ChatCard
                  key={chat.id}
                  contactName={chat.contactName}
                  contactPhone={chat.contactPhone}
                  lastMessage={`Agente: ${chat.assignedAgent?.fullName || 'Sin asignar'}`}
                  status={chat.status as any}
                  unreadCount={0}
                  lastMessageTime={chat.lastMessageAt}
                  campaignName={chat.campaignName}
                  onCardClick={() => handleCardClick(chat)}
                  onActionClick={(e) => handleChatMenuOpen(e, chat)}
                />
              ))}
            </Box>
          </Box>
          </>
          )}

          {/* Tab 1: Monitoreo de Agentes */}
          {tabValue === 1 && (
            <AgentMonitoring />
          )}
        </Box>
      </Box>

      {/* Menu de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleChatMenuClose}
      >
        <MenuItem onClick={handleViewChat}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver detalles</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAssignChat}>
          <ListItemIcon>
            <Assignment fontSize="small" />
          </ListItemIcon>
          <ListItemText>Asignar agente</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenWhatsApp}>
          <ListItemIcon>
            <Chat fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver conversación</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
