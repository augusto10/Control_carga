import { createTheme, ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#2563eb', // Azul profundo
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#10b981', // Verde moderno
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#f3f4f6',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#1f2937',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#1f2937',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1f2937',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      color: '#4b5563',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '8px 16px',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.2)',
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
