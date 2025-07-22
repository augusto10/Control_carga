import { createTheme } from '@mui/material/styles';

export const professionalTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#ff6b35',   // Laranja moderno
      light: '#ff8c42',  // Laranja claro
      dark: '#e55a2b',   // Laranja escuro
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1a1a1a',   // Preto moderno
      light: '#333333',
      dark: '#000000',
      contrastText: '#FFFFFF',
    },
    background: {
      default: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      paper: 'rgba(255, 255, 255, 0.95)',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: [
      '"Inter"',
      '"Roboto"',
      '"Helvetica"',
      '"Arial"',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 900,
      fontSize: 'clamp(2rem, 5vw, 3rem)',
      letterSpacing: '0.5px',
      color: '#1a1a1a',
    },
    h2: {
      fontWeight: 700,
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      letterSpacing: '0.3px',
      color: '#1a1a1a',
    },
    h3: {
      fontWeight: 600,
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
      letterSpacing: '0.2px',
      color: '#1a1a1a',
    },
    h4: {
      fontWeight: 600,
      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
      color: '#1a1a1a',
    },
    h5: {
      fontWeight: 500,
      fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)',
      color: '#1a1a1a',
    },
    h6: {
      fontWeight: 500,
      fontSize: 'clamp(1rem, 2vw, 1rem)',
      color: '#1a1a1a',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#1a1a1a',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#666666',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          padding: '12px 24px',
          fontWeight: 600,
          fontSize: '1rem',
          transition: 'all 0.3s ease',
          boxShadow: 'none',
          minHeight: '44px', // Melhor área de toque para mobile
          '@media (max-width: 900px)': {
            padding: '14px 20px',
            fontSize: '0.95rem',
            minHeight: '48px',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #ff6b35 30%, #ff8c42 90%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(45deg, #e55a2b 30%, #e57a35 90%)',
          },
        },
        outlined: {
          borderColor: '#ff6b35',
          color: '#ff6b35',
          borderWidth: '2px',
          '&:hover': {
            borderColor: '#e55a2b',
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          '@media (max-width: 900px)': {
            borderRadius: '12px',
            margin: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            '@media (max-width: 900px)': {
              transform: 'none', // Desabilita hover em mobile
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#ff6b35',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#ff6b35',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#ff6b35',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
          borderRight: 'none',
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          margin: '4px 12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 107, 53, 0.15)',
            borderLeft: '4px solid #ff6b35',
            '&:hover': {
              backgroundColor: 'rgba(255, 107, 53, 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
        },
        filled: {
          backgroundColor: 'rgba(255, 107, 53, 0.1)',
          color: '#ff6b35',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          fontWeight: 500,
        },
      },
    },
  },
});
