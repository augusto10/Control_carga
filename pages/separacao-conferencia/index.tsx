import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';

export default function SeparacaoConferenciaIndex() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Redireciona para a página do perfil correto
    switch (user.tipo) {
      case 'SEPARADOR':
        router.replace('/separacao-conferencia/separadores');
        break;
      case 'CONFERENTE':
        router.replace('/separacao-conferencia/conferentes');
        break;
      case 'AUDITOR':
        router.replace('/separacao-conferencia/auditores');
        break;
      case 'GERENTE':
        router.replace('/separacao-conferencia/gerentes');
        break;
      default:
        // Usuário sem perfil específico, pode exibir mensagem ou redirecionar para home
        router.replace('/');
    }
  }, [user, isLoading, router]);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      <Stack spacing={3} alignItems="center">
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={64} thickness={4} sx={{ color: 'primary.main', opacity: 0.2 }} />
          <CircularProgress 
            size={64} 
            thickness={4} 
            sx={{ 
              color: 'primary.main', 
              position: 'absolute',
              strokeLinecap: 'round'
            }} 
          />
          <SpeedIcon sx={{ position: 'absolute', fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom>
            Redirecionando
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            Acessando seu painel de controle...
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
