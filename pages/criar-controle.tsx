import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, alpha, useTheme } from '@mui/material';
import dynamic from 'next/dynamic';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Carrega o componente de forma dinâmica para evitar problemas de SSR
const CriarControleContent = dynamic(
  () => import('../components/CriarControleContent'),
  { ssr: false }
);

const CriarControlePage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isCheckingAuth) {
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
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Controles de Carga', href: '/controles' },
        { label: 'Criar Controle' }
      ]}
    >
      <CriarControleContent />
    </ResponsiveContainer>
  );
};

export default CriarControlePage;
