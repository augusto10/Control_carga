import { Typography, Box, CircularProgress } from '@mui/material';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function PaginaSeparadores() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.tipo !== 'SEPARADOR')) {
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

  if (!user || user.tipo !== 'SEPARADOR') {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Área do Separador</Typography>
      <Typography>Bem-vindo! Aqui você terá acesso às tarefas e informações exclusivas para separadores.</Typography>
    </Box>
  );
}
