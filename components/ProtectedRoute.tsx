import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

type TipoUsuario = 'ADMIN' | 'USUARIO';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: TipoUsuario[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['ADMIN', 'USUARIO'],
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    } else if (!isLoading && isAuthenticated && user && !allowedRoles.includes(user.tipo)) {
      // Usuário autenticado, mas sem permissão
      router.push('/acesso-negado');
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles, redirectTo]);

  if (isLoading) {
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

  if (!isAuthenticated || (user && !allowedRoles.includes(user.tipo))) {
    return null;
  }

  return <>{children}</>;
}
