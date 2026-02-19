import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';

// Carrega o componente de forma dinâmica para evitar problemas de SSR
const CriarControleContent = dynamic(
  () => import('../components/CriarControleContent'),
  { ssr: false }
);

const CriarControlePage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <CriarControleContent />;
};

export default CriarControlePage;
