import { ThemeProvider, CssBaseline } from '@mui/material';
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
