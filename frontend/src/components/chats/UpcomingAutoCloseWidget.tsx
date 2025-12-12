import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Empty, Spin, message, Progress, Tooltip, Button } from 'antd';
import {
  ClockCircleOutlined,
  WarningOutlined,
  PhoneOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.locale('es');

interface UpcomingChat {
  id: number;
  contactPhone: string;
  contactName?: string;
  hoursInactive: number;
  hoursRemaining: number;
  willCloseAt: string;
  assignedAgent?: {
    fullName: string;
  };
  debtor?: {
    fullName: string;
  };
}

interface UpcomingAutoCloseWidgetProps {
  hours?: number; // Mostrar chats que cerrarán en las próximas X horas
  onChatClick?: (chatId: number) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // en segundos
  showOnlyMyChats?: boolean;
}

export const UpcomingAutoCloseWidget: React.FC<UpcomingAutoCloseWidgetProps> = ({
  hours = 2,
  onChatClick,
  autoRefresh = true,
  refreshInterval = 60,
  showOnlyMyChats = false,
}) => {
  const [chats, setChats] = useState<UpcomingChat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUpcomingChats();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadUpcomingChats(true); // silent refresh
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, hours]);

  const loadUpcomingChats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/chats/upcoming-auto-close`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            hours,
          },
        },
      );

      let chatsData = response.data.data || [];

      // Filtrar solo mis chats si está habilitado
      if (showOnlyMyChats) {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user) {
          chatsData = chatsData.filter(
            (chat: UpcomingChat) => (chat.assignedAgent as any)?.id === user.id,
          );
        }
      }

      setChats(chatsData);
    } catch (error) {
      console.error('Error cargando chats próximos a cerrarse:', error);
      if (!silent) {
        message.error('Error al cargar chats próximos a cerrarse');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getProgressPercent = (hoursRemaining: number) => {
    const totalHours = 24;
    const percent = ((totalHours - (totalHours - hoursRemaining)) / totalHours) * 100;
    return Math.max(0, Math.min(100, 100 - percent));
  };

  const getProgressColor = (hoursRemaining: number) => {
    if (hoursRemaining <= 1) return '#ff4d4f'; // rojo
    if (hoursRemaining <= 3) return '#faad14'; // naranja
    return '#1890ff'; // azul
  };

  const getTimeString = (hoursRemaining: number) => {
    if (hoursRemaining < 1) {
      const minutes = Math.round(hoursRemaining * 60);
      return `${minutes} min`;
    }
    return `${Math.round(hoursRemaining)}h`;
  };

  const getUrgencyTag = (hoursRemaining: number) => {
    if (hoursRemaining <= 1) {
      return <Tag color="red" icon={<WarningOutlined />}>Urgente</Tag>;
    }
    if (hoursRemaining <= 3) {
      return <Tag color="orange" icon={<ClockCircleOutlined />}>Pronto</Tag>;
    }
    return <Tag color="blue" icon={<ClockCircleOutlined />}>Próximo</Tag>;
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ fontSize: 18, color: '#faad14' }} />
            <span>Chats próximos a cerrarse</span>
            {chats.length > 0 && (
              <Tag color="orange">{chats.length}</Tag>
            )}
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => loadUpcomingChats()}
            loading={loading}
            size="small"
          >
            Actualizar
          </Button>
        </div>
      }
      style={{ height: '100%' }}
      bodyStyle={{ padding: 0 }}
      size="small"
    >
      {loading && chats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : chats.length === 0 ? (
        <Empty
          description={`No hay chats que cerrarán en las próximas ${hours} horas`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: 40 }}
        />
      ) : (
        <List
          dataSource={chats}
          renderItem={(chat) => {
            const progressPercent = getProgressPercent(chat.hoursRemaining);
            const progressColor = getProgressColor(chat.hoursRemaining);
            const timeString = getTimeString(chat.hoursRemaining);

            return (
              <List.Item
                key={chat.id}
                style={{
                  padding: '12px 16px',
                  cursor: onChatClick ? 'pointer' : 'default',
                  transition: 'background 0.3s',
                }}
                onClick={() => onChatClick?.(chat.id)}
                onMouseEnter={(e) => {
                  if (onChatClick) {
                    e.currentTarget.style.background = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        <PhoneOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                        {chat.debtor?.fullName || chat.contactName || chat.contactPhone}
                      </div>
                      {chat.assignedAgent && (
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          <UserOutlined style={{ marginRight: 4 }} />
                          {chat.assignedAgent.fullName}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {getUrgencyTag(chat.hoursRemaining)}
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        Chat #{chat.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#595959' }}>
                        Tiempo restante: <strong>{timeString}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                        Inactivo: {chat.hoursInactive}h
                      </span>
                    </div>
                    <Tooltip title={`Se cerrará automáticamente ${dayjs(chat.willCloseAt).fromNow()}`}>
                      <Progress
                        percent={progressPercent}
                        strokeColor={progressColor}
                        size="small"
                        showInfo={false}
                      />
                    </Tooltip>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}

      {chats.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fff7e6',
            borderTop: '1px solid #ffe7ba',
            fontSize: 12,
            color: '#fa8c16',
            textAlign: 'center',
          }}
        >
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          Los chats se cerrarán automáticamente después de 24h de inactividad
        </div>
      )}
    </Card>
  );
};
