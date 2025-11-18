// Modern Stats Card - Inspired by Greeva Template
// Animated card with gradient background and trend indicators

import { Box, Card, CardContent, Typography, Avatar, Chip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { colors } from '../../theme/theme';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number;
  gradient?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const gradientMap = {
  primary: colors.gradients.primary,
  secondary: colors.gradients.secondary,
  success: colors.gradients.success,
  warning: colors.gradients.sunset,
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  info: colors.gradients.corporate,
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  gradient,
  color = 'primary',
}: StatsCardProps) {
  const bgGradient = gradient || gradientMap[color];

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'visible',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0px 12px 40px rgba(0,0,0,0.12)',
        },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: '2rem',
                lineHeight: 1,
                background: bgGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {value}
            </Typography>
          </Box>

          {icon && (
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: bgGradient,
                boxShadow: `0px 8px 24px ${color === 'primary' ? 'rgba(102, 126, 234, 0.4)' : 'rgba(0,0,0,0.2)'}`,
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              mb: trend || progress ? 2 : 0,
            }}
          >
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={trend.isPositive ? <TrendingUp /> : <TrendingDown />}
              label={`${trend.isPositive ? '+' : ''}${trend.value}%`}
              size="small"
              color={trend.isPositive ? 'success' : 'error'}
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              vs último período
            </Typography>
          </Box>
        )}

        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Progreso
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: bgGradient,
                },
              }}
            />
          </Box>
        )}
      </CardContent>

      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: bgGradient,
          opacity: 0.1,
          filter: 'blur(40px)',
        }}
      />
    </Card>
  );
}
