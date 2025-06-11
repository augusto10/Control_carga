import { Button, Container, Typography, Box } from '@mui/material';
import Link from 'next/link';

export default function Home() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Controle de Cargas Esplendor
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <Link href="/adicionar-notas" passHref>
            <Button variant="contained" fullWidth>
              Adicionar Notas
            </Button>
          </Link>
          <Link href="/criar-controle" passHref>
            <Button variant="contained" fullWidth>
              Criar Controle de Cargas
            </Button>
          </Link>
          <Link href="/listar-notas" passHref>
            <Button variant="contained" fullWidth>
              Consultar Notas
            </Button>
          </Link>
          <Link href="/listar-controles" passHref>
            <Button variant="contained" fullWidth>
              Consultar Controle de Cargas
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );
}
