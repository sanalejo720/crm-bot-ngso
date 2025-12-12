import React, { useState, useEffect } from 'react';
import { Card, List, Button, Tag, Empty, Spin, message, Tooltip, Badge } from 'antd';
import {
  ClockCircleOutlined,
  UserAddOutlined,
  PhoneOutlined,
  DollarOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

interface WaitingChat {
  id: number;
  contactPhone: string;
  contactName?: string;
  createdAt: string;
  lastClientMessageAt: string;
  unreadMessagesCount: number;
  debtor?: {
    fullName: string;
    totalDebt: number;
  };
  campaign?: {
    name: string;
  };
}

interface WaitingQueuePanelProps {
  onAssignChat?: (chatId: number) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // en segundos
}

export const WaitingQueuePanel: React.FC<WaitingQueuePanelProps> = ({
  onAssignChat,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  const [chats, setChats] = useState<WaitingChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningChatId, setAssigningChatId] = useState<number | null>(null);

  useEffect(() => {
    loadWaitingQueue();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadWaitingQueue(true); // silent refresh
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadWaitingQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/chats/waiting-queue`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setChats(response.data.data || []);
    } catch (error) {
      console.error('Error cargando cola de espera:', error);
      if (!silent) {
        message.error('Error al cargar cola de espera');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAssignToMe = async (chatId: number) => {
    setAssigningChatId(chatId);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        message.error('No se pudo obtener información del usuario');
        return;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/chats/${chatId}/assign`,
        {
          agentId: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      message.success('✅ Chat asignado exitosamente');
      onAssignChat?.(chatId);
      loadWaitingQueue();
    } catch (error: any) {
      console.error('Error asignando chat:', error);
      message.error(
        error.response?.data?.message || 'Error al asignar chat',
      );
    } finally {
      setAssigningChatId(null);
    }
  };

  const getWaitingTime = (date: string) => {
    return dayjs(date).fromNow();
  };

  const getWaitingMinutes = (date: string) => {
    return dayjs().diff(dayjs(date), 'minute');
  };

  const getPriorityColor = (minutes: number) => {
    if (minutes > 10) return '#ff4d4f'; // rojo
    if (minutes > 5) return '#faad14'; // naranja
    return '#52c41a'; // verde
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ fontSize: 18 }} />
            <span>Cola de Espera</span>
            <Badge count={chats.length} showZero style={{ backgroundColor: '#1890ff' }} />
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => loadWaitingQueue()}
            loading={loading}
            size="small"
          >
            Actualizar
          </Button>
        </div>
      }
      style={{ height: '100%' }}
      bodyStyle={{ padding: 0 }}
    >
      {loading && chats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : chats.length === 0 ? (
        <Empty
          description="No hay chats en espera"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: 40 }}
        />
      ) : (
        <List
          dataSource={chats}
          renderItem={(chat) => {
            const waitingMinutes = getWaitingMinutes(chat.lastClientMessageAt);
            const priorityColor = getPriorityColor(waitingMinutes);

            return (
              <List.Item
                key={chat.id}
                style={{
                  padding: '16px 20px',
                  borderLeft: `4px solid ${priorityColor}`,
                }}
                actions={[
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => handleAssignToMe(chat.id)}
                    loading={assigningChatId === chat.id}
                    size="small"
                  >
                    Asignarme
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PhoneOutlined style={{ color: '#1890ff' }} />
                      <span>{chat.debtor?.fullName || chat.contactName || chat.contactPhone}</span>
                      {chat.unreadMessagesCount > 0 && (
                        <Badge count={chat.unreadMessagesCount} style={{ backgroundColor: '#ff4d4f' }} />
                      )}
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <Tooltip title="Tiempo en espera">
                          <Tag icon={<ClockCircleOutlined />} color={priorityColor}>
                            {getWaitingTime(chat.lastClientMessageAt)}
                          </Tag>
                        </Tooltip>

                        {chat.campaign && (
                          <Tag color="blue">{chat.campaign.name}</Tag>
                        )}

                        {chat.debtor && (
                          <Tooltip title="Deuda total">
                            <Tag icon={<DollarOutlined />} color="orange">
                              ${chat.debtor.totalDebt.toLocaleString()}
                            </Tag>
                          </Tooltip>
                        )}

                        {chat.unreadMessagesCount > 0 && (
                          <Tooltip title="Mensajes sin leer">
                            <Tag icon={<MessageOutlined />} color="red">
                              {chat.unreadMessagesCount} mensajes
                            </Tag>
                          </Tooltip>
                        )}
                      </div>

                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        <PhoneOutlined style={{ marginRight: 4 }} />
                        {chat.contactPhone}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};
