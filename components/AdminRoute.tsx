import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { USER_TYPES } from '../types/auth-types';

interface AdminRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AdminRoute({ 
  children, 
  redirectTo = '/acesso-negado' 
}: AdminRouteProps) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (status !== 'loading') {
      setIsCheckingAuth(false);
      if (status !== 'authenticated' || session?.user?.tipo !== USER_TYPES.ADMIN) {
        router.replace(redirectTo);
      }
    }
  }, [status, session, router, redirectTo]);

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

  if (status === 'authenticated' && session?.user?.tipo === USER_TYPES.ADMIN) {
    return <>{children}</>;
  }

  return null; // Não autorizado
}
