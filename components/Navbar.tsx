import { AppBar, Toolbar, Button, Box } from '@mui/material';
import Link from 'next/link';

export default function Navbar() {
  return (
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ justifyContent: 'center', gap: 2 }}>
        <Link href="/adicionar-notas" passHref legacyBehavior>
          <Button color="inherit" sx={{ fontWeight: 600 }}>
            Adicionar Notas
          </Button>
        </Link>
        <Link href="/criar-controle" passHref legacyBehavior>
          <Button color="inherit" sx={{ fontWeight: 600 }}>
            Criar Controle
          </Button>
        </Link>
        <Link href="/listar-controles" passHref legacyBehavior>
          <Button color="inherit" sx={{ fontWeight: 600 }}>
            Listar Controles
          </Button>
        </Link>
      </Toolbar>
    </AppBar>
  );
}
