import { Box, Button, Container, Typography } from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <Container maxWidth="md">
      <Head>
        <title>Página não encontrada</title>
      </Head>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Typography variant="h1" color="primary" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
          404
        </Typography>
        <Typography variant="h4" component="h1" gutterBottom>
          Página não encontrada
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '600px' }}>
          A página que você está procurando pode ter sido removida, ter mudado de nome ou está temporariamente indisponível.
        </Typography>
        <Link href="/" passHref>
          <Button variant="contained" color="primary" size="large">
            Voltar para a página inicial
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
