// Modern Chat Card - Inspired by Greeva Template
// Beautiful chat card with status indicators and animations

import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  WhatsApp,
  Schedule,
  CheckCircle,
  AccessTime,
  MoreVert,
  Phone,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatCardProps {
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageTime?: string;
  status: 'waiting' | 'active' | 'in-break' | 'closed';
  unreadCount?: number;
  campaignName?: string;
  onCardClick?: () => void;
  onActionClick?: (event: React.MouseEvent) => void;
}

const statusConfig = {
  waiting: {
    label: 'En Espera',
    color: 'warning' as const,
    icon: <Schedule fontSize="small" />,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  bot: {
    label: 'Bot',
    color: 'info' as const,
    icon: <AccessTime fontSize="small" />,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
  active: {
    label: 'Activo',
    color: 'success' as const,
    icon: <CheckCircle fontSize="small" />,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  pending: {
    label: 'Pendiente',
    color: 'warning' as const,
    icon: <Schedule fontSize="small" />,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  resolved: {
    label: 'Resuelto',
    color: 'success' as const,
    icon: <CheckCircle fontSize="small" />,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  'in-break': {
    label: 'En Pausa',
    color: 'info' as const,
    icon: <AccessTime fontSize="small" />,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  closed: {
    label: 'Cerrado',
    color: 'default' as const,
    icon: <CheckCircle fontSize="small" />,
    gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
  },
};

export default function ChatCard({
  contactName,
  contactPhone,
  lastMessage,
  lastMessageTime,
  status,
  unreadCount = 0,
  campaignName,
  onCardClick,
  onActionClick,
}: ChatCardProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting || {
    label: 'Desconocido',
    color: 'default' as const,
    icon: <Schedule fontSize="small" />,
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true, locale: es });
    } catch {
      return '';
    }
  };

  return (
    <Card
      onClick={onCardClick}
      sx={{
        cursor: onCardClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderLeft: '4px solid',
        borderLeftColor: unreadCount > 0 ? '#6366f1' : 'transparent',
        '&:hover': {
          transform: 'translateY(-2px) scale(1.01)',
          boxShadow: '0px 12px 40px rgba(0,0,0,0.12)',
          '& .action-buttons': {
            opacity: 1,
          },
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Avatar */}
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: config.gradient,
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            }
          >
            <Avatar
              sx={{
                width: 52,
                height: 52,
                background: config.gradient,
                fontWeight: 600,
                fontSize: '1.1rem',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {getInitials(contactName)}
            </Avatar>
          </Badge>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {contactName}
              </Typography>

              {unreadCount > 0 && (
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      minWidth: 20,
                      height: 20,
                    },
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                {contactPhone}
              </Typography>
            </Box>

            {lastMessage && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 1.5,
                  fontSize: '0.875rem',
                }}
              >
                {lastMessage}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={config.icon}
                label={config.label}
                size="small"
                color={config.color}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />

              {campaignName && (
                <Chip
                  icon={<WhatsApp fontSize="small" />}
                  label={campaignName}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: 24,
                  }}
                />
              )}

              {lastMessageTime && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    ml: 'auto',
                  }}
                >
                  {formatTime(lastMessageTime)}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box
            className="action-buttons"
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            <Tooltip title="Más opciones">
              <IconButton
                size="small"
                onClick={onActionClick}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>

      {/* Decorative gradient overlay */}
      {unreadCount > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
            pointerEvents: 'none',
            borderRadius: 'inherit',
          }}
        />
      )}
    </Card>
  );
}
