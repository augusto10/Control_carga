import { Typography, Box, CircularProgress } from '@mui/material';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function PaginaAuditores() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.tipo !== 'AUDITOR')) {
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

  if (!user || user.tipo !== 'AUDITOR') {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Área do Auditor</Typography>
      <Typography>Bem-vindo! Aqui você terá acesso às tarefas e informações exclusivas para auditores.</Typography>
    </Box>
  );
}
