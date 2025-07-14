import { Container, Typography, Box } from '@mui/material';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import ListarConferencias from '@/components/ListarConferencias';

const ConferenciasPage: NextPage = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Verificar autenticação e permissões quando o componente for montado
    if (!isLoading) {
      if (!isAuthenticated) {
        // Se não estiver autenticado, redireciona para o login
        router.push(`/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
      } else if (user && !['ADMIN', 'GERENTE', 'AUDITOR', 'USUARIO'].includes(user.tipo)) {
        // Se não tiver permissão, redireciona para a página inicial
        router.push('/?error=unauthorized');
      } else {
        setAuthorized(true);
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading || !authorized) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography>Carregando...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Lista de Conferências
        </Typography>
        <ListarConferencias />
      </Box>
    </Container>
  );
};

export default ConferenciasPage;
