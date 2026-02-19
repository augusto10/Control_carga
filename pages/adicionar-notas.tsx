import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES } from '../types/auth-types';
import ProtectedRoute from '../components/ProtectedRoute';

// Carrega o componente de forma dinâmica para evitar problemas de SSR
const AdicionarNotasContent = dynamic(
  () => import('../components/AdicionarNotasContent'),
  { 
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }
);

const AdicionarNotasPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Se estiver carregando, mostra um loader
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[USER_TYPES.ADMIN, USER_TYPES.GERENTE, USER_TYPES.USUARIO]}>
      <AdicionarNotasContent />
    </ProtectedRoute>
  );
};

export default AdicionarNotasPage;
