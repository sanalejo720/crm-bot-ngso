import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SwapOutlined,
  PauseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface ChatStateIndicatorProps {
  status: string;
  subStatus?: string;
  size?: 'small' | 'middle' | 'large';
  showIcon?: boolean;
  showTooltip?: boolean;
}

interface StateConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const STATE_CONFIGS: Record<string, StateConfig> = {
  // Estados principales
  bot: {
    label: 'Bot',
    color: 'blue',
    icon: <RobotOutlined />,
    description: 'Chat manejado por el bot',
  },
  waiting: {
    label: 'En espera',
    color: 'orange',
    icon: <ClockCircleOutlined />,
    description: 'Chat esperando asignación',
  },
  active: {
    label: 'Activo',
    color: 'green',
    icon: <MessageOutlined />,
    description: 'Chat activo con agente',
  },
  pending: {
    label: 'Pendiente',
    color: 'gold',
    icon: <PauseCircleOutlined />,
    description: 'Chat pendiente de acción',
  },
  resolved: {
    label: 'Resuelto',
    color: 'cyan',
    icon: <CheckCircleOutlined />,
    description: 'Chat resuelto, pendiente de cierre',
  },
  closed: {
    label: 'Cerrado',
    color: 'default',
    icon: <LockOutlined />,
    description: 'Chat cerrado',
  },

  // Sub-estados del bot
  bot_active: {
    label: 'Bot activo',
    color: 'blue',
    icon: <RobotOutlined />,
    description: 'Bot conversando con el cliente',
  },
  bot_waiting_queue: {
    label: 'En cola',
    color: 'orange',
    icon: <ClockCircleOutlined />,
    description: 'Esperando asignación manual',
  },

  // Sub-estados activos
  active_conversation: {
    label: 'Conversación activa',
    color: 'green',
    icon: <MessageOutlined />,
    description: 'Agente conversando con cliente',
  },
  transferring: {
    label: 'Transfiriendo',
    color: 'purple',
    icon: <SwapOutlined />,
    description: 'Chat siendo transferido a otro agente',
  },

  // Sub-estados de cierre
  closed_resolved: {
    label: 'Cerrado - Resuelto',
    color: 'success',
    icon: <CheckCircleOutlined />,
    description: 'Chat cerrado exitosamente',
  },
  closed_client_inactive: {
    label: 'Cerrado - Cliente inactivo',
    color: 'default',
    icon: <LockOutlined />,
    description: 'Cerrado por inactividad del cliente',
  },
  closed_agent_timeout: {
    label: 'Cerrado - Timeout agente',
    color: 'error',
    icon: <WarningOutlined />,
    description: 'Cerrado por timeout del agente',
  },
  closed_auto: {
    label: 'Cerrado - Automático',
    color: 'default',
    icon: <LockOutlined />,
    description: 'Cerrado automáticamente por inactividad',
  },
};

export const ChatStateIndicator: React.FC<ChatStateIndicatorProps> = ({
  status,
  subStatus,
  size = 'middle',
  showIcon = true,
  showTooltip = true,
}) => {
  // Determinar qué estado mostrar (prioridad a subStatus si existe)
  const stateKey = subStatus || status;
  const config = STATE_CONFIGS[stateKey] || STATE_CONFIGS[status] || {
    label: status,
    color: 'default',
    icon: null,
    description: status,
  };

  const fontSize = size === 'small' ? 11 : size === 'large' ? 15 : 13;

  const tag = (
    <Tag
      color={config.color}
      icon={showIcon ? config.icon : undefined}
      style={{ fontSize }}
    >
      {config.label}
    </Tag>
  );

  if (showTooltip) {
    return (
      <Tooltip title={config.description} placement="top">
        {tag}
      </Tooltip>
    );
  }

  return tag;
};

// Componente helper para mostrar múltiples indicadores
interface MultiStateIndicatorProps {
  status: string;
  subStatus?: string;
  isBotActive?: boolean;
  transferCount?: number;
  size?: 'small' | 'middle' | 'large';
}

export const MultiStateIndicator: React.FC<MultiStateIndicatorProps> = ({
  status,
  subStatus,
  isBotActive,
  transferCount,
  size = 'middle',
}) => {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <ChatStateIndicator
        status={status}
        subStatus={subStatus}
        size={size}
      />

      {isBotActive && status !== 'bot' && (
        <Tooltip title="Bot está activo en este chat">
          <Tag color="blue" icon={<RobotOutlined />} style={{ fontSize: size === 'small' ? 11 : 13 }}>
            Bot activo
          </Tag>
        </Tooltip>
      )}

      {transferCount && transferCount > 0 && (
        <Tooltip title={`Transferido ${transferCount} ${transferCount === 1 ? 'vez' : 'veces'}`}>
          <Tag color="purple" icon={<SwapOutlined />} style={{ fontSize: size === 'small' ? 11 : 13 }}>
            {transferCount}x
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

// Helper para obtener color de progreso según estado
export const getStateProgressColor = (status: string, subStatus?: string): string => {
  const stateKey = subStatus || status;
  const config = STATE_CONFIGS[stateKey];

  const colorMap: Record<string, string> = {
    blue: '#1890ff',
    orange: '#fa8c16',
    green: '#52c41a',
    gold: '#faad14',
    cyan: '#13c2c2',
    purple: '#722ed1',
    success: '#52c41a',
    error: '#ff4d4f',
    default: '#d9d9d9',
  };

  return colorMap[config?.color] || '#d9d9d9';
};
