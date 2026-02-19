'use client';

import { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import NextLink from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h1" sx={{ mb: 2 }}>
        Ocorreu um erro!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        {error.message}
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => reset()}
        sx={{ mr: 2 }}
      >
        Tentar novamente
      </Button>
      <NextLink href="/" passHref>
        <Button variant="outlined">
          Página inicial
        </Button>
      </NextLink>
    </Box>
  );
}
