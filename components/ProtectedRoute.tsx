import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (status === 'loading') return;

    // Se é uma rota pública, não precisa verificar autenticação
    if (PUBLIC_ROUTES.includes(router.pathname)) {
      setIsCheckingAuth(false);
      return;
    }

    // Se não está autenticado, marca para redirecionar
    if (status !== 'authenticated') {
      console.log('[ProtectedRoute] Usuário não autenticado, redirecionando para login...');
      setShouldRedirect(true);
      return;
    }

    // Se está autenticado, verifica as permissões
    if (session?.user) {
      const hasPermission = allowedRoles.includes(session.user.tipo);
      if (!hasPermission) {
        console.log('[ProtectedRoute] Usuário não autorizado, redirecionando...');
        router.push('/acesso-negado');
        return;
      }
    }

    // Se chegou até aqui, está tudo ok
    setIsCheckingAuth(false);
  }, [status, session, router, allowedRoles]);

  // Efeito para lidar com o redirecionamento
  useEffect(() => {
    if (shouldRedirect && status !== 'loading' && status !== 'authenticated') {
      router.push(redirectTo);
    }
  }, [shouldRedirect, status, router, redirectTo]);

  // Mostra um loader enquanto verifica a autenticação
  if (status === 'loading' || isCheckingAuth) {
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

  // Se é uma rota pública ou o usuário está autenticado e autorizado, renderiza os filhos
  if (
    PUBLIC_ROUTES.includes(router.pathname) ||
    (status === 'authenticated' && session?.user && allowedRoles.includes(session.user.tipo))
  ) {
    return <>{children}</>;
  }

  // Se não está autorizado e não está carregando, não renderiza nada
  return null;
}
