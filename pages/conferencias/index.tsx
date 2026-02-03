import { Container, Typography, Box, Stack, Avatar, useTheme, alpha, CircularProgress, Paper } from '@mui/material';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import ListarConferencias from '@/components/ListarConferencias';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { AssignmentTurnedIn as ConferenciasIcon } from '@mui/icons-material';
import ProtectedRoute from '@/components/ProtectedRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

const ConferenciasPage: NextPage = () => {
  const theme = useTheme();
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
      } else if (user && !['ADMIN', 'GERENTE', 'AUDITOR', 'USUARIO'].includes(user.tipo)) {
        router.push('/?error=unauthorized');
      } else {
        setAuthorized(true);
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading || !authorized) {
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
            <ConferenciasIcon sx={{ position: 'absolute', fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom>
              Carregando Conferências
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight="500">
              Sincronizando registros e dados de carga...
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Conferências' }
        ]}
      >
        <ListarConferencias />
      </ResponsiveContainer>
    </ProtectedRoute>
  );
};

export default ConferenciasPage;
