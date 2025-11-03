import { useDeviceDetect } from './useDeviceDetect';
import { useTheme } from '@mui/material';

export interface ResponsiveStyles {
  spacing: {
    padding: number | string;
    margin: number | string;
    gap: number;
  };
  typography: {
    fontSize: {
      title: string;
      subtitle: string;
      body: string;
    };
  };
  layout: {
    maxWidth: number | string;
    borderRadius: number;
    elevation: number;
  };
  components: {
    button: {
      height: number;
      padding: string;
    };
    input: {
      height: number;
    };
    card: {
      padding: number;
    };
  };
}

export function useResponsiveStyles(): ResponsiveStyles {
  const { isMobile } = useDeviceDetect();
  const theme = useTheme();

  return {
    spacing: {
      padding: isMobile ? theme.spacing(2) : theme.spacing(3),
      margin: isMobile ? theme.spacing(1) : theme.spacing(2),
      gap: isMobile ? 8 : 16
    },
    typography: {
      fontSize: {
        title: isMobile ? '1.5rem' : '2rem',
        subtitle: isMobile ? '1.25rem' : '1.5rem',
        body: isMobile ? '0.875rem' : '1rem'
      }
    },
    layout: {
      maxWidth: isMobile ? '100%' : 1200,
      borderRadius: isMobile ? 0 : 8,
      elevation: isMobile ? 0 : 1
    },
    components: {
      button: {
        height: isMobile ? 48 : 36,
        padding: isMobile ? '12px 24px' : '6px 16px'
      },
      input: {
        height: isMobile ? 56 : 40
      },
      card: {
        padding: isMobile ? 16 : 24
      }
    }
  };
}