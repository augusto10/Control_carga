import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { USER_TYPES } from '../types/auth-types';

// Lista de rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = ['/login', '/esqueci-senha', '/cadastro'];

type TipoUsuario = typeof USER_TYPES.ADMIN | typeof USER_TYPES.GERENTE | typeof USER_TYPES.USUARIO;

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: TipoUsuario[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [USER_TYPES.ADMIN, USER_TYPES.GERENTE, USER_TYPES.USUARIO],
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (isLoading) return;

    // Se é uma rota pública, não precisa verificar autenticação
    if (PUBLIC_ROUTES.includes(router.pathname)) {
      return;
    }

    // Se não está autenticado e não está na página de login, redireciona
    if (!isAuthenticated && router.pathname !== '/login') {
      console.log('[ProtectedRoute] Usuário não autenticado, redirecionando para login...');
      router.replace(redirectTo);
      return;
    }

    // Se está autenticado, verifica as permissões
    if (isAuthenticated && user) {
      const hasPermission = allowedRoles.includes(user.tipo);
      if (!hasPermission) {
        console.log('[ProtectedRoute] Usuário não autorizado, redirecionando...');
        router.replace('/acesso-negado');
      }
    }
  }, [isLoading, isAuthenticated, user, router.pathname, allowedRoles, redirectTo]);

  // Mostra um loader enquanto verifica a autenticação
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

  // Se não está autenticado e não é rota pública, não renderiza nada (vai redirecionar)
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
    return null;
  }

  // Se está autenticado mas não tem permissão, não renderiza nada (vai redirecionar)
  if (isAuthenticated && user && !allowedRoles.includes(user.tipo)) {
    return null;
  }

  return <>{children}</>;
}
