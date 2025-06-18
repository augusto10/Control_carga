import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { USER_TYPES } from '../types/auth-types';

type TipoUsuario = typeof USER_TYPES.ADMIN | typeof USER_TYPES.GERENTE | typeof USER_TYPES.USUARIO;

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
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    // Só verifica a autenticação depois que o carregamento inicial for concluído
    if (!isLoading) {
      setCheckedAuth(true);
      
      // Se não está autenticado e não está na página de login, redireciona para a página de login
      if (!isAuthenticated && router.pathname !== '/login') {
        console.log('[ProtectedRoute] Usuário não autenticado, redirecionando para login...');
        router.push(redirectTo);
        return;
      }

      // Se está autenticado mas não tem permissão, redireciona para acesso negado
      if (isAuthenticated && user && !allowedRoles.includes(user.tipo)) {
        console.log('[ProtectedRoute] Usuário não autorizado, redirecionando...');
        router.push('/acesso-negado');
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router, allowedRoles, redirectTo]);

  // Mostra um loader enquanto verifica a autenticação
  if (isLoading || !checkedAuth) {
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

  // Se chegou até aqui, o usuário está autenticado e tem permissão
  return <>{children}</>;
}
