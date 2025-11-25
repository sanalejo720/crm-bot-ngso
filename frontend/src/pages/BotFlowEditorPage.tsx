import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Toolbar,
  Drawer,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Message as MessageIcon,
  Menu as MenuIcon,
  Input as InputIcon,
  CallSplit as ConditionIcon,
  Cloud as ApiIcon,
  Person as TransferIcon,
  Stop as EndIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from 'reactflow';
import type { Node, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { botFlowsService } from '../services/botFlowsService';
import type { BotFlow, BotNode, CreateBotNodeDto } from '../services/botFlowsService';

const NODE_TYPES = [
  { type: 'message', label: 'Mensaje', icon: <MessageIcon />, color: '#2196F3' },
  { type: 'menu', label: 'Menú', icon: <MenuIcon />, color: '#4CAF50' },
  { type: 'input', label: 'Capturar Input', icon: <InputIcon />, color: '#FF9800' },
  { type: 'condition', label: 'Condición', icon: <ConditionIcon />, color: '#9C27B0' },
  { type: 'api_call', label: 'API Call', icon: <ApiIcon />, color: '#00BCD4' },
  { type: 'transfer_agent', label: 'Transferir', icon: <TransferIcon />, color: '#F44336' },
  { type: 'end', label: 'Fin', icon: <EndIcon />, color: '#757575' },
];

export default function BotFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [flow, setFlow] = useState<BotFlow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editingNode, setEditingNode] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadFlow();
    }
  }, [id]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const response = await botFlowsService.getFlow(id!);
      const flowData = response.data.data;
      setFlow(flowData);

      // Convertir nodos de BD a formato React Flow
      if (flowData.nodes) {
        const reactFlowNodes = flowData.nodes.map((node: BotNode) => ({
          id: node.id,
          type: 'default',
          position: { x: node.positionX, y: node.positionY },
          data: {
            label: node.name,
            nodeType: node.type,
            config: node.config,
          },
          style: {
            backgroundColor: NODE_TYPES.find(t => t.type === node.type)?.color || '#fff',
            color: '#fff',
            padding: 10,
            borderRadius: 8,
            minWidth: 150,
          },
        }));

        const reactFlowEdges = flowData.nodes
          .filter((node: BotNode) => node.nextNodeId)
          .map((node: BotNode) => ({
            id: `${node.id}-${node.nextNodeId}`,
            source: node.id,
            target: node.nextNodeId!,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          }));

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
      }
    } catch (error) {
      console.error('Error cargando flujo:', error);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleAddNode = (type: string) => {
    const nodeType = NODE_TYPES.find(t => t.type === type);
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: `${nodeType?.label || 'Nodo'} ${nodes.length + 1}`,
        nodeType: type,
        config: {},
      },
      style: {
        backgroundColor: nodeType?.color || '#fff',
        color: '#fff',
        padding: 10,
        borderRadius: 8,
        minWidth: 150,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = (_event: any, node: Node) => {
    setSelectedNode(node);
    setEditingNode({
      name: node.data.label,
      type: node.data.nodeType,
      config: node.data.config || {},
    });
  };

  const handleUpdateNode = () => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: editingNode.name,
                config: editingNode.config,
              },
            }
          : node
      )
    );
    setSelectedNode(null);
    setEditingNode(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const handleSaveFlow = async () => {
    if (!flow) return;

    try {
      // Convertir nodos de React Flow a formato BD
      const nodesToSave: CreateBotNodeDto[] = nodes.map((node) => ({
        name: node.data.label,
        type: node.data.nodeType,
        config: node.data.config || {},
        nextNodeId: edges.find((e) => e.source === node.id)?.target,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }));

      // Primero eliminar todos los nodos existentes
      if (flow.nodes && flow.nodes.length > 0) {
        for (const node of flow.nodes) {
          await botFlowsService.deleteNode(flow.id, node.id);
        }
      }

      // Crear nuevos nodos
      if (nodesToSave.length > 0) {
        await botFlowsService.createNodesBulk(flow.id, nodesToSave);
      }

      // Establecer nodo inicial si existe
      if (nodes.length > 0) {
        await botFlowsService.updateFlow(flow.id, {
          startNodeId: nodes[0].id,
        });
      }

      alert('Flujo guardado exitosamente');
      loadFlow();
    } catch (error) {
      console.error('Error guardando flujo:', error);
      alert('Error guardando flujo');
    }
  };

  const handlePublish = async () => {
    if (!flow) return;

    try {
      await botFlowsService.publishFlow(flow.id);
      alert('Flujo publicado exitosamente');
      loadFlow();
    } catch (error) {
      console.error('Error publicando flujo:', error);
      alert('Error publicando flujo');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!flow) {
    return (
      <Box p={3}>
        <Alert severity="error">Flujo no encontrado</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Agregar Nodo
          </Typography>
          <List>
            {NODE_TYPES.map((nodeType) => (
              <ListItem key={nodeType.type} disablePadding>
                <ListItemButton onClick={() => handleAddNode(nodeType.type)}>
                  <ListItemIcon sx={{ color: nodeType.color }}>
                    {nodeType.icon}
                  </ListItemIcon>
                  <ListItemText primary={nodeType.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {selectedNode && (
            <>
              <Typography variant="h6" gutterBottom>
                Editar Nodo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nombre del Nodo"
                  fullWidth
                  size="small"
                  value={editingNode?.name || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                />
                {editingNode?.type === 'message' && (
                  <TextField
                    label="Mensaje"
                    fullWidth
                    multiline
                    rows={4}
                    size="small"
                    value={editingNode?.config?.message || ''}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        config: { ...editingNode.config, message: e.target.value },
                      })
                    }
                  />
                )}
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={handleUpdateNode}
                  >
                    Actualizar
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                  >
                    <DeleteIcon />
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <Paper sx={{ height: '100%' }}>
          {/* Toolbar */}
          <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <IconButton onClick={() => navigate('/bot-flows')}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
              {flow.name}
            </Typography>
            <Chip
              label={flow.status === 'active' ? 'Activo' : flow.status === 'draft' ? 'Borrador' : 'Inactivo'}
              color={flow.status === 'active' ? 'success' : 'warning'}
              size="small"
              sx={{ mr: 2 }}
            />
            {flow.status === 'draft' && (
              <Button
                variant="outlined"
                startIcon={<PublishIcon />}
                onClick={handlePublish}
                sx={{ mr: 1 }}
              >
                Publicar
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveFlow}
            >
              Guardar
            </Button>
          </Toolbar>

          {/* React Flow Canvas */}
          <Box sx={{ height: 'calc(100% - 64px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              fitView
            >
              <Background />
              <Controls />
              <Panel position="top-left">
                <Typography variant="caption" color="textSecondary">
                  {nodes.length} nodos · {edges.length} conexiones
                </Typography>
              </Panel>
            </ReactFlow>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
