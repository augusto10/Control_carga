import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import NextLink from 'next/link';

export default function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h1" sx={{ mb: 2 }}>
        {statusCode || 'Erro'}
      </Typography>
      <Typography variant="h5" sx={{ mb: 4 }}>
        {statusCode === 404 
          ? 'Página não encontrada' 
          : 'Ocorreu um erro inesperado'}
      </Typography>
      <NextLink href="/" passHref>
        <Button variant="contained">
          Voltar para a página inicial
        </Button>
      </NextLink>
    </Box>
  );
}

ErrorPage.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
