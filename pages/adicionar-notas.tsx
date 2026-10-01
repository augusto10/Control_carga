import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES } from '../types/auth-types';
import ProtectedRoute from '../components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

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
  const { isLoading } = useAuth();

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
      <AppLayout 
        title="Adicionar Notas" 
        subtitle="Registre novas notas fiscais no sistema"
      >
        <AdicionarNotasContent />
      </AppLayout>
    </ProtectedRoute>
  );
};

(AdicionarNotasPage as any).usesAppLayout = true;

export default AdicionarNotasPage;
