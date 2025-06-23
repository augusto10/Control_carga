import { AppBar, Toolbar, Button, Box, Container, useMediaQuery, useTheme } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AppBar position="static" elevation={0}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" passHref>
              <Button color="inherit" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ mr: 1 }}>🏠</Box>
                {!isMobile && 'Início'}
              </Button>
            </Link>

            {isAuthenticated && (
              <>
                <Link href="/adicionar-notas" passHref>
                  <Button color="inherit" sx={{ fontWeight: 600 }}>
                    {isMobile ? '➕' : 'Adicionar Notas'}
                  </Button>
                </Link>
                <Link href="/criar-controle" passHref>
                  <Button color="inherit" sx={{ fontWeight: 600 }}>
                    {isMobile ? '📝' : 'Criar Controle'}
                  </Button>
                </Link>
                <Link href="/listar-controles" passHref>
                  <Button color="inherit" sx={{ fontWeight: 600 }}>
                    {isMobile ? '📋' : 'Listar Controles'}
                  </Button>
                </Link>
                
                {user?.tipo === 'ADMIN' && (
                  <Link href="/admin" passHref>
                    <Button color="secondary" variant="outlined" size="small" sx={{ ml: 1, fontWeight: 600 }}>
                      {isMobile ? '👑' : 'Admin'}
                    </Button>
                  </Link>
                )}
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <Link href="/login" passHref>
                  <Button color="inherit" variant="outlined" size="small" sx={{ fontWeight: 600 }}>
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro" passHref>
                  <Button color="primary" variant="contained" size="small" sx={{ fontWeight: 600 }}>
                    Cadastrar
                  </Button>
                </Link>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
