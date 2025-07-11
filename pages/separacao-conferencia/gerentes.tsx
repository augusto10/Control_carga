import { Typography, Box } from '@mui/material';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function PaginaGerentes() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.tipo !== 'GERENTE') {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (!user || user.tipo !== 'GERENTE') {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Área do Gerente</Typography>
      <Typography>Bem-vindo! Aqui você terá acesso às tarefas e informações exclusivas para gerentes.</Typography>
    </Box>
  );
}
