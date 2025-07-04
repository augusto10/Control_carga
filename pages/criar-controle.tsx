import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';

// Carrega o componente de forma dinâmica para evitar problemas de SSR
const CriarControleContent = dynamic(
  () => import('../components/CriarControleContent'),
  { ssr: false }
);

const CriarControlePage = () => {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status !== 'authenticated') {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [status, router]);

  if (status === 'loading' || isCheckingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <CriarControleContent />;
};

export default CriarControlePage;
