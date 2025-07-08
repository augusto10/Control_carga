import { Typography, Box } from '@mui/material';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Typography, CircularProgress } from '@mui/material';

export default function PaginaConferentes() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.tipo !== 'CONFERENTE')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.tipo !== 'CONFERENTE') {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Área do Conferente</Typography>
      <Typography>Bem-vindo! Aqui você terá acesso às tarefas e informações exclusivas para conferentes.</Typography>
    </Box>
  );
}
