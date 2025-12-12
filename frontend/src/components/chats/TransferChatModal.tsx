import React, { useState, useEffect } from 'react';
import { Button, Modal, Select, Input, message, Spin, Tag } from 'antd';
import { SwapOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;

interface Agent {
  id: number;
  fullName: string;
  email: string;
  currentChatsCount: number;
  maxConcurrentChats: number;
  state: string;
}

interface TransferChatModalProps {
  chatId: number;
  currentAgentId: number;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const TransferChatModal: React.FC<TransferChatModalProps> = ({
  chatId,
  currentAgentId,
  onSuccess,
  trigger,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      loadAvailableAgents();
    }
  }, [isModalOpen]);

  const loadAvailableAgents = async () => {
    setLoadingAgents(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            role: 'Agente',
          },
        },
      );

      // Filtrar agentes disponibles (no el actual)
      const availableAgents = response.data.data.filter(
        (agent: Agent) =>
          agent.id !== currentAgentId &&
          agent.state !== 'offline' &&
          agent.currentChatsCount < agent.maxConcurrentChats,
      );

      setAgents(availableAgents);
    } catch (error) {
      console.error('Error cargando agentes:', error);
      message.error('Error al cargar agentes disponibles');
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedAgentId(null);
    setReason('');
    setNotes('');
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedAgentId(null);
    setReason('');
    setNotes('');
  };

  const handleTransfer = async () => {
    if (!selectedAgentId) {
      message.warning('Por favor selecciona un agente');
      return;
    }

    if (!reason.trim()) {
      message.warning('Por favor indica el motivo de la transferencia');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/chats/${chatId}/transfer`,
        {
          newAgentId: selectedAgentId,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      message.success('✅ Chat transferido exitosamente');
      setIsModalOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error transfiriendo chat:', error);
      message.error(
        error.response?.data?.message || 'Error al transferir chat',
      );
    } finally {
      setLoading(false);
    }
  };

  const getAgentStateColor = (state: string) => {
    const colors: Record<string, string> = {
      available: 'green',
      busy: 'orange',
      break: 'blue',
      offline: 'gray',
    };
    return colors[state] || 'default';
  };

  const getAgentStateLabel = (state: string) => {
    const labels: Record<string, string> = {
      available: 'Disponible',
      busy: 'Ocupado',
      break: 'En descanso',
      offline: 'Desconectado',
    };
    return labels[state] || state;
  };

  const getCapacityPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const renderTrigger = () => {
    if (trigger) {
      return <div onClick={handleOpenModal}>{trigger}</div>;
    }

    return (
      <Button
        type="default"
        icon={<SwapOutlined />}
        onClick={handleOpenModal}
        style={{ borderColor: '#722ed1', color: '#722ed1' }}
      >
        Transferir
      </Button>
    );
  };

  return (
    <>
      {renderTrigger()}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <span>Transferir chat a otro agente</span>
          </div>
        }
        open={isModalOpen}
        onOk={handleTransfer}
        onCancel={handleCancel}
        okText="Transferir"
        cancelText="Cancelar"
        confirmLoading={loading}
        width={700}
        okButtonProps={{
          disabled: !selectedAgentId || !reason.trim(),
        }}
      >
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Agente destino <span style={{ color: 'red' }}>*</span>
            </label>
            {loadingAgents ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            ) : agents.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  background: '#fff7e6',
                  borderRadius: 6,
                  textAlign: 'center',
                  border: '1px solid #ffd591',
                }}
              >
                ⚠️ No hay agentes disponibles en este momento
              </div>
            ) : (
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona un agente"
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                size="large"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={agents.map((agent) => {
                  return {
                    value: agent.id,
                    label: agent.fullName,
                    agent,
                  };
                })}
                optionRender={(option) => {
                  const agent = option.data.agent as Agent;
                  const capacity = getCapacityPercentage(
                    agent.currentChatsCount,
                    agent.maxConcurrentChats,
                  );

                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          <UserOutlined style={{ marginRight: 6 }} />
                          {agent.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {agent.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Tag color={getAgentStateColor(agent.state)}>
                          {getAgentStateLabel(agent.state)}
                        </Tag>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {agent.currentChatsCount}/{agent.maxConcurrentChats} chats
                          <span
                            style={{
                              marginLeft: 4,
                              color: capacity > 75 ? '#ff4d4f' : '#52c41a',
                            }}
                          >
                            ({capacity}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Motivo de transferencia <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="Ej: Cliente solicita otro idioma, tema especializado, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              showCount
              size="large"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Notas adicionales (opcional)
            </label>
            <TextArea
              placeholder="Contexto adicional para el agente receptor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              showCount
            />
          </div>

          <div
            style={{
              padding: 12,
              background: '#f6ffed',
              borderRadius: 6,
              border: '1px solid #b7eb8f',
            }}
          >
            <div style={{ fontSize: 13, color: '#52c41a', fontWeight: 500 }}>
              ℹ️ Al transferir el chat:
            </div>
            <ul
              style={{
                fontSize: 12,
                color: '#595959',
                margin: '8px 0 0 0',
                paddingLeft: 20,
              }}
            >
              <li>Se notificará al nuevo agente sobre la transferencia</li>
              <li>Se enviará un mensaje al cliente informando del cambio</li>
              <li>El historial del chat será visible para el nuevo agente</li>
              <li>Los contadores de ambos agentes se actualizarán</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};
