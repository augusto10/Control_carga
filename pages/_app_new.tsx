import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { professionalTheme } from '../styles/theme';
import { SnackbarProvider } from 'notistack';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { AuthProvider } from '../contexts/AuthContext';
import { ConfiguracaoProvider } from '../contexts/ConfiguracaoContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Lista de rotas públicas que não requerem autenticação
const publicRoutes = ['/login', '/esqueci-senha', '/cadastro'];

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false); // Inicialmente false, pode ser alterado conforme necessário
  const router = useRouter();
  const isPublicRoute = publicRoutes.includes(router.pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evita a renderização do lado do servidor para evitar problemas de hidratação
  if (!mounted) {
    return null;
  }

  // Determinar se o layout deve ser aplicado (não aplicar na página de login, por exemplo)
  const getLayout = (page: React.ReactNode) => {
    if (isPublicRoute) {
      return page;
    }
    
    return (
      <ProtectedRoute>
        <Layout>{page}</Layout>
      </ProtectedRoute>
    );
  };

  // Componente de carregamento global
  const GlobalLoader = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }}
    >
      <CircularProgress size={60} />
    </Box>
  );

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3000}
      >
        <AuthProvider>
          <ConfiguracaoProvider>
            {/* Mostrar o loader global quando estiver carregando configurações */}
            {loading && <GlobalLoader />}
            {getLayout(<Component {...pageProps} />)}
          </ConfiguracaoProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

// Adicionando tipo para o componente MyApp
const MyAppWithType: React.FC<AppProps> = (props) => <MyApp {...props} />;

export default MyAppWithType;
