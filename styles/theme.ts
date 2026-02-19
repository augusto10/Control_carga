import { createTheme } from '@mui/material/styles';

export const professionalTheme = createTheme({
  palette: {
    primary: {
      main: '#F79A00',   // Dark Orange
      light: '#FFC04D',  // Light Orange
      dark: '#C77800',   // Slightly darker shade
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#232323',   // Graphite / Dark Gray
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#232323',
      secondary: '#646464',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.75rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          padding: '10px 24px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});
