// Theme Configuration - Inspired by Greeva Template
// Modern, professional color palette and design system

import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

// Color Palette - Colores Corporativos NGS&O
const colors = {
  // Primary - Gris Corporativo (Predominante)
  primary: {
    main: '#4a5568', // Gris medio corporativo
    light: '#718096',
    dark: '#2d3748',
    contrastText: '#ffffff',
  },
  // Secondary - Naranja Corporativo
  secondary: {
    main: '#ff6b35', // Naranja vibrante
    light: '#ff8c5a',
    dark: '#e55a2b',
    contrastText: '#ffffff',
  },
  // Success - Green
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  // Warning - Naranja (corporativo)
  warning: {
    main: '#ff6b35',
    light: '#ff8c5a',
    dark: '#e55a2b',
  },
  // Error - Red
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  // Info - Gris azulado
  info: {
    main: '#4a5568',
    light: '#718096',
    dark: '#2d3748',
  },
  // Grays - Modern neutral palette
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Background gradients - Colores corporativos
  gradients: {
    primary: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)', // Gris
    secondary: 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)', // Naranja
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    sunset: 'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)', // Naranja
    corporate: 'linear-gradient(135deg, #2d3748 0%, #ff6b35 100%)', // Gris a Naranja
  },
};

// Light Theme
export const lightTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    background: {
      default: '#f7fafc', // Blanco con tinte gris muy sutil
      paper: '#ffffff', // Blanco puro para cards
    },
    text: {
      primary: '#2d3748', // Gris oscuro para texto principal
      secondary: '#718096', // Gris medio para texto secundario
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 6px rgba(0,0,0,0.05)',
    '0px 5px 15px rgba(0,0,0,0.08)',
    '0px 10px 24px rgba(0,0,0,0.1)',
    '0px 15px 35px rgba(0,0,0,0.12)',
    '0px 20px 40px rgba(0,0,0,0.14)',
    '0px 24px 48px rgba(0,0,0,0.16)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 6px rgba(0,0,0,0.05)',
    '0px 5px 15px rgba(0,0,0,0.08)',
    '0px 10px 24px rgba(0,0,0,0.1)',
    '0px 15px 35px rgba(0,0,0,0.12)',
    '0px 20px 40px rgba(0,0,0,0.14)',
    '0px 24px 48px rgba(0,0,0,0.16)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 6px rgba(0,0,0,0.05)',
    '0px 5px 15px rgba(0,0,0,0.08)',
    '0px 10px 24px rgba(0,0,0,0.1)',
    '0px 15px 35px rgba(0,0,0,0.12)',
    '0px 20px 40px rgba(0,0,0,0.14)',
    '0px 24px 48px rgba(0,0,0,0.16)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 6px rgba(0,0,0,0.05)',
    '0px 5px 15px rgba(0,0,0,0.08)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0,0,0,0.06)',
          border: `1px solid ${colors.gray[100]}`,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
        },
        elevation3: {
          boxShadow: '0px 6px 16px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&:hover fieldset': {
              borderColor: colors.primary.main,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255,255,255,0.8)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.gray[200]}`,
          boxShadow: '4px 0px 12px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: colors.primary.main,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: colors.primary.dark,
            },
            '& .MuiListItemIcon-root': {
              color: '#ffffff',
            },
          },
          '&:hover': {
            backgroundColor: colors.gray[100],
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.gray[800],
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '8px 12px',
        },
      },
    },
  },
};

// Dark Theme
export const darkTheme: ThemeOptions = {
  ...lightTheme,
  palette: {
    mode: 'dark',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: '#334155',
  },
};

// Create themes
export const lightThemeObj = createTheme(lightTheme);
export const darkThemeObj = createTheme(darkTheme);

// Export color palette for direct use
export { colors };
