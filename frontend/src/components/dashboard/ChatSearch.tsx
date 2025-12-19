// Chat Search - NGS&O CRM Gestión
// Búsqueda avanzada de chats para supervisores
// Desarrollado por: Alejandro Sandoval - AS Software

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Pagination,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search,
  Visibility,
  PhoneAndroid,
  Person,
  Campaign as CampaignIcon,
  Clear,
} from '@mui/icons-material';
import apiService from '../../services/api';
import { formatCurrency, formatRelativeDate } from '../../utils/helpers';
import type { Campaign, User } from '../../types/index';

interface ChatResult {
  id: string;
  externalId: string;
  contactName?: string;
  contactPhone: string;
  status: string;
  priority: number;
  unreadCount: number;
  startedAt: string;
  closedAt?: string;
  campaign?: {
    id: string;
    name: string;
  };
  client?: {
    id: string;
    fullName: string;
    documentNumber?: string;
    debtAmount: number;
    collectionStatus: string;
  };
  assignedAgent?: {
    id: string;
    fullName: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  resolution_type?: string;
}

export default function ChatSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [results, setResults] = useState<ChatResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [campaignsRes, agentsRes] = await Promise.all([
        apiService.get('/campaigns'),
        apiService.get('/users', { params: { isAgent: true } }),
      ]);
      setCampaigns(campaignsRes.data.data || campaignsRes.data || []);
      setAgents(agentsRes.data.data || agentsRes.data || []);
    } catch (error) {
      console.error('Error cargando filtros:', error);
    }
  };

  const handleSearch = async (pageNum = 1) => {
    setIsLoading(true);
    setHasSearched(true);
    setPage(pageNum);

    try {
      const params: Record<string, any> = {
        page: pageNum,
        limit: 15,
        includeRelations: true,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedCampaign !== 'all') {
        params.campaignId = selectedCampaign;
      }
      if (selectedAgent !== 'all') {
        params.assignedAgentId = selectedAgent;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await apiService.get('/chats', { params });
      const data = response.data.data || response.data || [];
      const pagination = response.data.pagination || { totalPages: 1, total: data.length };
      
      setResults(Array.isArray(data) ? data : []);
      setTotalPages(pagination.totalPages || 1);
      setTotalResults(pagination.total || data.length);
    } catch (error) {
      console.error('Error buscando chats:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCampaign('all');
    setSelectedAgent('all');
    setSelectedStatus('all');
    setResults([]);
    setHasSearched(false);
  };

  const handleViewChat = (chatId: string) => {
    window.open(`/agent?chatId=${chatId}`, '_blank');
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'active': 'success',
      'waiting': 'warning',
      'resolved': 'info',
      'closed': 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'active': 'Activo',
      'waiting': 'En espera',
      'resolved': 'Resuelto',
      'closed': 'Cerrado',
    };
    return labels[status] || status;
  };

  const getResolutionLabel = (type?: string): string => {
    if (!type) return '-';
    const labels: Record<string, string> = {
      'paid': '💰 Pagado',
      'promise': '📅 Promesa',
      'no_agreement': '❌ Sin acuerdo',
      'callback': '📞 Callback',
    };
    return labels[type] || type;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        🔍 Búsqueda de Chats
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            sx={{ flex: '2 1 300px', minWidth: 200 }}
            size="small"
            placeholder="Buscar por nombre, número o cédula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 150 }}>
            <InputLabel>Campaña</InputLabel>
            <Select
              value={selectedCampaign}
              label="Campaña"
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <MenuItem value="all">Todas</MenuItem>
              {campaigns.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 150 }}>
            <InputLabel>Agente</InputLabel>
            <Select
              value={selectedAgent}
              label="Agente"
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              {agents.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 120px', minWidth: 120 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={selectedStatus}
              label="Estado"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="waiting">En espera</MenuItem>
              <MenuItem value="active">Activo</MenuItem>
              <MenuItem value="resolved">Resuelto</MenuItem>
              <MenuItem value="closed">Cerrado</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Search />}
            disabled={isLoading}
          >
            Buscar
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            startIcon={<Clear />}
          >
            Limpiar
          </Button>
        </Box>
      </Paper>

      {/* Resumen rápido */}
      {hasSearched && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Total encontrados</Typography>
              <Typography variant="h5" fontWeight="bold">{totalResults}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Activos</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {results.filter(r => r.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">En espera</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {results.filter(r => r.status === 'waiting').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Deuda Total</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(results.reduce((sum, r) => sum + (r.client?.debtAmount || 0), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Resultados */}
      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Campaña</TableCell>
                <TableCell>Agente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Resolución</TableCell>
                <TableCell align="right">Deuda</TableCell>
                <TableCell>Último mensaje</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Buscando...</Typography>
                  </TableCell>
                </TableRow>
              ) : !hasSearched ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      Usa los filtros para buscar chats
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No se encontraron chats con los criterios especificados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                results.map((chat) => (
                  <TableRow key={chat.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {chat.client?.fullName || chat.contactName || 'Sin nombre'}
                          </Typography>
                          {chat.client?.documentNumber && (
                            <Typography variant="caption" color="text.secondary">
                              CC: {chat.client.documentNumber}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneAndroid fontSize="small" color="action" />
                        <Typography variant="body2">{chat.contactPhone || chat.externalId}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {chat.campaign ? (
                        <Chip
                          icon={<CampaignIcon />}
                          label={chat.campaign.name}
                          size="small"
                          variant="outlined"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {chat.assignedAgent ? (
                        <Typography variant="body2">{chat.assignedAgent.fullName}</Typography>
                      ) : (
                        <Chip label="Sin asignar" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(chat.status)}
                        size="small"
                        color={getStatusColor(chat.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getResolutionLabel(chat.resolution_type)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" color="error.main">
                        {chat.client?.debtAmount ? formatCurrency(chat.client.debtAmount) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {chat.lastMessage ? (
                        <Tooltip title={chat.lastMessage.content}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {formatRelativeDate(chat.lastMessage.createdAt)}
                          </Typography>
                        </Tooltip>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver chat">
                        <IconButton size="small" onClick={() => handleViewChat(chat.id)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => handleSearch(p)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
