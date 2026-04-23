import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { professionalTheme } from '../styles/theme';
import { SnackbarProvider, MaterialDesignContent } from 'notistack';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

// Estilização global para o Notistack (Glassmorphism)
const StyledMaterialDesignContent = styled(MaterialDesignContent)(({ theme }) => ({
  '&.notistack-MuiContent': {
    borderRadius: '16px',
    backdropFilter: 'blur(12px)',
    fontWeight: 600,
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
    padding: '4px 16px',
    minWidth: '300px',
  },
  '&.notistack-MuiContent-success': {
    backgroundColor: alpha(theme.palette.success.main, 0.15),
    color: theme.palette.success.dark,
    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
    '& .notistack-MuiContent-icon': {
      color: theme.palette.success.main,
    },
  },
  '&.notistack-MuiContent-error': {
    backgroundColor: alpha(theme.palette.error.main, 0.15),
    color: theme.palette.error.dark,
    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
    '& .notistack-MuiContent-icon': {
      color: theme.palette.error.main,
    },
  },
  '&.notistack-MuiContent-warning': {
    backgroundColor: alpha(theme.palette.warning.main, 0.15),
    color: theme.palette.warning.dark,
    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
    '& .notistack-MuiContent-icon': {
      color: theme.palette.warning.main,
    },
  },
  '&.notistack-MuiContent-info': {
    backgroundColor: alpha(theme.palette.info.main, 0.15),
    color: theme.palette.info.dark,
    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
    '& .notistack-MuiContent-icon': {
      color: theme.palette.info.main,
    },
  },
}));
import VisualPageLayout from '../components/VisualPageLayout';
import { AuthProvider } from '../contexts/AuthContext';
import { ConfiguracaoProvider } from '../contexts/ConfiguracaoContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Lista de rotas públicas que não requerem autenticação
const publicRoutes = ['/login', '/esqueci-senha', '/cadastro'];

// Removendo o estado loading e o GlobalLoader
// O carregamento agora será gerenciado pelos contextos
function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isPublicRoute = publicRoutes.includes(router.pathname);
  const isMobileSnack = useMediaQuery('(max-width:600px)', { noSsr: true });
  const anchorOrigin = isMobileSnack
    ? { vertical: 'bottom', horizontal: 'center' }
    : { vertical: 'top', horizontal: 'center' };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const getLayout = (page: React.ReactNode) => {
    if (isPublicRoute) {
      return page;
    }

    const Comp: any = Component as any;

    if (Comp.usesAppLayout) {
      return (
        <ProtectedRoute>
          {page}
        </ProtectedRoute>
      );
    }

    const path = router.pathname === '/'
      ? 'Início'
      : router.pathname
          .replace(/^\//, '')
          .split('/')
          .filter(Boolean)
          .map(seg => seg.replace(/[-_]/g, ' '))
          .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
          .join(' / ');

    return (
      <ProtectedRoute>
        <AppLayout title={Comp.pageTitle || path}>
          {page}
        </AppLayout>
      </ProtectedRoute>
    );
  };

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      {/** Responsividade do snackbar: topo no desktop, rodapé no mobile **/}
      {/** Sem comentários no código de produção conforme convenções **/}
      {/** Determina ponto de ancoragem dinamicamente **/}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      {/**  */}
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={anchorOrigin}
        autoHideDuration={3500}
        preventDuplicate
        Components={{
          success: StyledMaterialDesignContent,
          error: StyledMaterialDesignContent,
          warning: StyledMaterialDesignContent,
          info: StyledMaterialDesignContent,
        }}
        style={{
          maxWidth: '90%',
          margin: '0 auto',
        }}
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
