import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress, alpha, useTheme } from '@mui/material';
import dynamic from 'next/dynamic';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Carrega o componente de forma dinâmica para evitar problemas de SSR
const ListarControlesContent = dynamic(
  () => import('../components/ListarControlesContent'),
  { ssr: false }
);

const ControlesPage = () => {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const theme = useTheme();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status !== 'authenticated') {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [status, router]);

  if (status === 'loading' || isCheckingAuth) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ResponsiveContainer
      breadcrumb={[
        { label: 'Dashboard', path: '/' },
        { label: 'Controles de Carga' }
      ]}
    >
      <ListarControlesContent />
    </ResponsiveContainer>
  );
};

export default ControlesPage;
