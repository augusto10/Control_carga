import { ThemeProvider, CssBaseline } from '@mui/material';
import { professionalTheme } from '../styles/theme';
import { SnackbarProvider } from 'notistack';
import { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evita a renderização do lado do servidor para evitar problemas de hidratação
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3000}
      >
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default MyApp;
