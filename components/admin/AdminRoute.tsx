import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { USER_TYPES } from '../../types/auth-types';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      const isAdmin = session.user.tipo === USER_TYPES.ADMIN;
      if (!isAdmin) {
        router.push('/acesso-negado');
        return;
      }
    }

    setIsChecking(false);
  }, [status, session, router]);

  if (status === 'loading' || isChecking) {
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
  if (status === 'authenticated' && session?.user?.tipo === USER_TYPES.ADMIN) {
    return <>{children}</>;
  }

  // Se não está autorizado e não está carregando, não renderiza nada
  return null;
}
