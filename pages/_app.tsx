import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { professionalTheme } from '../styles/theme';
import { SnackbarProvider } from 'notistack';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ConfiguracaoProvider } from '../contexts/ConfiguracaoContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Lista de rotas públicas que não requerem autenticação
const publicRoutes = ['/login', '/esqueci-senha', '/cadastro'];

function AppContent({ Component, pageProps, isPublicRoute }: { Component: React.ComponentType<any>, pageProps: any, isPublicRoute: boolean }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    // Se não está carregando e não está autenticado, redireciona para o login
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }
    
    // Se está autenticado ou é rota pública, mostra o conteúdo
    if (isAuthenticated || isPublicRoute) {
      setShowContent(true);
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);
  
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
  
  // Determinar se o layout deve ser aplicado (não aplicar na página de login, por exemplo)
  const getLayout = (page: React.ReactNode) => {
    if (isPublicRoute || !isAuthenticated) {
      return page;
    }
    
    return (
      <ProtectedRoute>
        <Layout>{page}</Layout>
      </ProtectedRoute>
    );
  };
  
  // Se estiver carregando, mostra o loader global
  if (isLoading) {
    return <GlobalLoader />;
  }
  
  // Se não estiver em uma rota pública e não estiver autenticado, redireciona para o login
  if (!isPublicRoute && !isAuthenticated && !isLoading) {
    if (typeof window !== 'undefined') {
      router.push('/login');
      return <GlobalLoader />;
    }
    return null;
  }
  
  return getLayout(<Component {...pageProps} />);
}

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isPublicRoute = publicRoutes.includes(router.pathname);

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
        <AuthProvider>
          <ConfiguracaoProvider>
            <AppContent 
              Component={Component} 
              pageProps={pageProps} 
              isPublicRoute={isPublicRoute} 
            />
          </ConfiguracaoProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );

}

// Adicionando tipo para o componente MyApp
const MyAppWithType: React.FC<AppProps> = (props) => <MyApp {...props} />;

export default MyAppWithType;
