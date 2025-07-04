import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { USER_TYPES } from '../../types/auth-types';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (isLoading) return;

    // Se não está autenticado, redireciona para o login
    if (!isAuthenticated) {
      console.log('[AdminRoute] Usuário não autenticado, redirecionando para login...');
      router.push('/login');
      return;
    }

    // Se está autenticado, verifica se é administrador
    if (user) {
      const isAdmin = user.tipo === USER_TYPES.ADMIN;
      if (!isAdmin) {
        console.log('[AdminRoute] Acesso negado: usuário não é administrador');
        router.push('/acesso-negado');
        return;
      }
    }

    // Se chegou até aqui, está tudo ok
    setIsChecking(false);
  }, [isLoading, isAuthenticated, user, router]);

  // Mostra um loader enquanto verifica a autenticação
  if (isLoading || isChecking) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se o usuário está autenticado e é administrador, renderiza os filhos
  if (isAuthenticated && user?.tipo === USER_TYPES.ADMIN) {
    return <>{children}</>;
  }

  // Se não está autorizado e não está carregando, não renderiza nada
  return null;
}
