import { Container, Typography, Box, Stack, alpha, CircularProgress, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  VerifiedUser as AuditorIcon,
  Description as RelatoriosIcon,
  AssignmentTurnedIn as ConferenciasIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';

const MotionBox = motion(Box);

export default function PaginaAuditores() {
  const theme = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  useEffect(() => {
    if (!isLoading && (!user || user.tipo !== 'AUDITOR')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
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
            <AuditorIcon sx={{ position: 'absolute', fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom>
              Carregando Painel
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight="500">
              Preparando suas ferramentas de auditoria...
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }

  if (!user || user.tipo !== 'AUDITOR') {
    return null;
  }

  const menuItems = [
    { title: 'Conferências', icon: <ConferenciasIcon />, path: '/conferencias', color: '#3b82f6', desc: 'Gerenciar conferências realizadas' },
    { title: 'Relatórios', icon: <RelatoriosIcon />, path: '/separacao-conferencia/relatorios', color: '#10b981', desc: 'Visualizar relatórios de auditoria' },
    { title: 'Confirmar Auditoria', icon: <AuditorIcon />, path: '/separacao-conferencia/confirmar-auditoria', color: '#6366f1', desc: 'Realizar novas auditorias de carga' },
    { title: 'Configurações', icon: <SettingsIcon />, path: '#', color: '#64748b', desc: 'Ajustes do perfil e preferências' },
  ];

  return (
    <Layout>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        pt: { xs: 2, md: 4 },
        pb: { xs: 4, md: 6 }
      }}>
        <Container maxWidth="xl">
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ 
              mb: 6,
              p: 4,
              borderRadius: 4,
              ...glassStyles,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2
            }}
          >
            <Stack direction="row" alignItems="center" spacing={3}>
              <Box sx={{ 
                bgcolor: 'primary.main', 
                width: 64, 
                height: 64, 
                borderRadius: 3,
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AuditorIcon sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                  Painel do Auditor
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight="500">
                  Bem-vindo, {user.nome}! Gerencie a qualidade e precisão das cargas.
                </Typography>
              </Box>
            </Stack>
          </MotionBox>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
            {menuItems.map((item, index) => (
              <MotionBox
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => router.push(item.path)}
                sx={{ 
                  p: 3,
                  borderRadius: 4,
                  ...glassStyles,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  '&:hover': {
                    background: alpha('#ffffff', 0.9),
                    boxShadow: `0 20px 40px -12px ${alpha(item.color, 0.15)}`,
                  }
                }}
              >
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: alpha(item.color, 0.1), 
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="800" color="text.primary">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    {item.desc}
                  </Typography>
                </Box>
              </MotionBox>
            ))}
          </Box>
        </Container>
      </Box>
    </Layout>
  );
}
