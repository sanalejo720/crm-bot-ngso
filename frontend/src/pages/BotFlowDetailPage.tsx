import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  List,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  Message as MessageIcon,
  QuestionAnswer as MenuIcon,
  Input as InputIcon,
  CallSplit as ConditionIcon,
  SwapHoriz as TransferIcon,
  Stop as EndIcon,
  Api as ApiIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';
import { botFlowsService } from '../services/botFlowsService';
import type { BotFlow, BotNode } from '../services/botFlowsService';
import ModernSidebar from '../components/layout/ModernSidebar';
import AppHeader from '../components/layout/AppHeader';

export default function BotFlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen] = useState(true);
  const [flow, setFlow] = useState<BotFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadFlow(id);
    }
  }, [id]);

  const loadFlow = async (flowId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await botFlowsService.getFlow(flowId);
      setFlow(response.data.data || response.data);
    } catch (err: any) {
      console.error('Error cargando flujo:', err);
      setError(err.response?.data?.message || 'Error al cargar el flujo');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!flow) return;
    try {
      await botFlowsService.publishFlow(flow.id);
      loadFlow(flow.id);
    } catch (err) {
      console.error('Error publicando flujo:', err);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageIcon color="primary" />;
      case 'menu':
        return <MenuIcon color="secondary" />;
      case 'input':
        return <InputIcon color="info" />;
      case 'condition':
        return <ConditionIcon color="warning" />;
      case 'transfer_agent':
        return <TransferIcon color="success" />;
      case 'end':
        return <EndIcon color="error" />;
      case 'api_call':
        return <ApiIcon color="action" />;
      default:
        return <MessageIcon />;
    }
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return 'Mensaje';
      case 'menu':
        return 'Menú';
      case 'input':
        return 'Entrada';
      case 'condition':
        return 'Condición';
      case 'transfer_agent':
        return 'Transferir a Agente';
      case 'end':
        return 'Fin';
      case 'api_call':
        return 'Llamada API';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'draft':
        return 'Borrador';
      case 'inactive':
        return 'Inactivo';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <ModernSidebar open={sidebarOpen} />
        <Box sx={{ flexGrow: 1 }}>
          <AppHeader />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Box>
      </Box>
    );
  }

  if (error || !flow) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <ModernSidebar open={sidebarOpen} />
        <Box sx={{ flexGrow: 1 }}>
          <AppHeader />
          <Box sx={{ p: 3 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/bot-flows')}
              sx={{ mb: 2 }}
            >
              Volver a Flujos
            </Button>
            <Alert severity="error">
              {error || 'No se encontró el flujo'}
            </Alert>
          </Box>
        </Box>
      </Box>
    );
  }

  // Ordenar nodos: primero el nodo inicial, luego los demás
  const sortedNodes = flow.nodes ? [...flow.nodes].sort((a, b) => {
    if (a.id === flow.startNodeId) return -1;
    if (b.id === flow.startNodeId) return 1;
    return 0;
  }) : [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ModernSidebar open={sidebarOpen} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/bot-flows')}
              >
                Volver
              </Button>
              <Typography variant="h4">
                🤖 {flow.name}
              </Typography>
              <Chip
                label={getStatusLabel(flow.status)}
                color={getStatusColor(flow.status) as any}
                size="small"
              />
            </Box>
            <Box display="flex" gap={1}>
              {flow.status === 'draft' && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<PublishIcon />}
                  onClick={handlePublish}
                >
                  Publicar
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/bot-flows/${flow.id}/editor`)}
              >
                Editar Flujo
              </Button>
            </Box>
          </Box>

          {/* Info del Flujo */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información General
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={3}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Descripción
                </Typography>
                <Typography variant="body1">
                  {flow.description || 'Sin descripción'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Total de Nodos
                </Typography>
                <Typography variant="body1">
                  {flow.nodes?.length || 0} nodos
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Fecha de Creación
                </Typography>
                <Typography variant="body1">
                  {new Date(flow.createdAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Última Actualización
                </Typography>
                <Typography variant="body1">
                  {new Date(flow.updatedAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Variables */}
          {flow.variables && Object.keys(flow.variables).length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Variables del Flujo
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(flow.variables).map(([key, value]: [string, any]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value.type}`}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* Nodos */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Nodos del Flujo ({sortedNodes.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {sortedNodes.length === 0 ? (
              <Alert severity="info">
                Este flujo no tiene nodos configurados. Usa el editor para agregar nodos.
              </Alert>
            ) : (
              <List>
                {sortedNodes.map((node: BotNode) => (
                  <Card key={node.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'action.hover',
                          }}
                        >
                          {getNodeIcon(node.type)}
                        </Box>
                        <Box flexGrow={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {node.name}
                            </Typography>
                            {node.id === flow.startNodeId && (
                              <Chip
                                icon={<StartIcon />}
                                label="Inicio"
                                color="primary"
                                size="small"
                              />
                            )}
                            <Chip
                              label={getNodeTypeLabel(node.type)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          {node.config?.message && (
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              sx={{
                                mt: 1,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {node.config.message.substring(0, 150)}
                              {node.config.message.length > 150 ? '...' : ''}
                            </Typography>
                          )}
                          {node.config?.buttons && node.config.buttons.length > 0 && (
                            <Box display="flex" gap={1} mt={1}>
                              {node.config.buttons.map((btn: any, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={btn.text}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                          {node.config?.options && node.config.options.length > 0 && (
                            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                              {node.config.options.map((opt: any, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={opt.label}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                        <Tooltip title="Editar nodo">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/bot-flows/${flow.id}/editor`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
