import { Box, Button, Container, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import LockIcon from '@mui/icons-material/Lock';
import Head from 'next/head';

export default function AcessoNegado() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>Acesso Negado | Sistema de Controle</title>
        <meta name="description" content="Você não tem permissão para acessar esta página" />
      </Head>
      
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Box sx={{ mb: 4 }}>
          <LockIcon sx={{ fontSize: 100, color: 'error.main' }} />
        </Box>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Acesso Negado
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Você não tem permissão para acessar esta página.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleGoHome}
            color="primary"
          >
            Página Inicial
          </Button>
        </Box>
      </Container>
    </>
  );
}
