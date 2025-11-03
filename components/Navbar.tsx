import { AppBar, Toolbar, Button, Box, Container, useMediaQuery, useTheme, Menu, MenuItem, Divider } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { 
  ExpandMore as ExpandMoreIcon,
  Assignment as ChecklistIcon,
  Assessment as ReportIcon,
  Warning as AlertIcon
} from '@mui/icons-material';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [checklistMenuAnchor, setChecklistMenuAnchor] = useState<null | HTMLElement>(null);
  const [relatoriosMenuAnchor, setRelatoriosMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters 
          sx={{ 
            justifyContent: 'space-between',
            minHeight: isMobile ? 56 : 64,
            px: isMobile ? 1 : 2
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 0.5 : 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none'
          }}>
            <Link href="/" passHref>
              <Button 
                color="inherit" 
                sx={{ 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center',
                  minWidth: isMobile ? 48 : 'auto',
                  px: isMobile ? 1 : 2,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Box component="span" sx={{ mr: isMobile ? 0 : 1, fontSize: isMobile ? 18 : 16 }}>🏠</Box>
                {!isMobile && 'Início'}
              </Button>
            </Link>

            {isAuthenticated && (
              <>
                <Link href="/separacao-conferencia/separadores" passHref>
                  <Button 
                    color="inherit" 
                    sx={{ 
                      fontWeight: 600,
                      minWidth: isMobile ? 48 : 'auto',
                      px: isMobile ? 1 : 2,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isMobile ? '➕' : 'Separar Pedido'}
                  </Button>
                </Link>
                <Link href="/separacao-conferencia/conferentes" passHref>
                  <Button 
                    color="inherit" 
                    sx={{ 
                      fontWeight: 600,
                      minWidth: isMobile ? 48 : 'auto',
                      px: isMobile ? 1 : 2,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isMobile ? '📋' : 'Conferir Pedido'}
                  </Button>
                </Link>
                <Link href="/conferencias" passHref>
                  <Button 
                    color="inherit" 
                    sx={{ 
                      fontWeight: 600,
                      minWidth: isMobile ? 48 : 'auto',
                      px: isMobile ? 1 : 2,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isMobile ? '📝' : 'Listar Conferências'}
                  </Button>
                </Link>
                {/* Menu Checklist com submenu */}
                <Button 
                  color="inherit" 
                  sx={{ 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center',
                    minWidth: isMobile ? 48 : 'auto',
                    px: isMobile ? 1 : 2,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => setChecklistMenuAnchor(e.currentTarget)}
                  endIcon={!isMobile ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : null}
                >
                  <ChecklistIcon sx={{ mr: isMobile ? 0 : 1, fontSize: isMobile ? 20 : 18 }} />
                  {!isMobile && 'Checklist'}
                </Button>
                <Menu
                  anchorEl={checklistMenuAnchor}
                  open={Boolean(checklistMenuAnchor)}
                  onClose={() => setChecklistMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      borderRadius: 2,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  <MenuItem onClick={() => { router.push('/checklist-recebimento/regras-ouro'); setChecklistMenuAnchor(null); }}>
                    <ChecklistIcon sx={{ mr: 2, color: 'primary.main' }} />
                    Novo Checklist
                  </MenuItem>
                  <MenuItem onClick={() => { router.push('/checklist-recebimento/relatorios'); setChecklistMenuAnchor(null); }}>
                    <ReportIcon sx={{ mr: 2, color: 'info.main' }} />
                    Relatórios Checklist
                  </MenuItem>
                  <MenuItem onClick={() => { router.push('/checklist-recebimento/relatorio-validade'); setChecklistMenuAnchor(null); }}>
                    <AlertIcon sx={{ mr: 2, color: 'warning.main' }} />
                    Alertas de Validade
                  </MenuItem>
                </Menu>

                {/* Menu Relatórios com submenu */}
                <Button 
                  color="inherit" 
                  sx={{ 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center',
                    minWidth: isMobile ? 48 : 'auto',
                    px: isMobile ? 1 : 2,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => setRelatoriosMenuAnchor(e.currentTarget)}
                  endIcon={!isMobile ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : null}
                >
                  <ReportIcon sx={{ mr: isMobile ? 0 : 1, fontSize: isMobile ? 20 : 18 }} />
                  {!isMobile && 'Relatórios'}
                </Button>
                <Menu
                  anchorEl={relatoriosMenuAnchor}
                  open={Boolean(relatoriosMenuAnchor)}
                  onClose={() => setRelatoriosMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      borderRadius: 2,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  <MenuItem onClick={() => { router.push('/relatorios'); setRelatoriosMenuAnchor(null); }}>
                    <ReportIcon sx={{ mr: 2, color: 'primary.main' }} />
                    Relatórios Gerais
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { router.push('/checklist-recebimento/relatorios'); setRelatoriosMenuAnchor(null); }}>
                    <ChecklistIcon sx={{ mr: 2, color: 'info.main' }} />
                    Checklist Recebimento
                  </MenuItem>
                  <MenuItem onClick={() => { router.push('/checklist-recebimento/relatorio-validade'); setRelatoriosMenuAnchor(null); }}>
                    <AlertIcon sx={{ mr: 2, color: 'warning.main' }} />
                    Alertas de Validade
                  </MenuItem>
                </Menu>

                <Link href="/gerar-etiquetas" passHref>
                  <Button 
                    color="inherit" 
                    sx={{ 
                      fontWeight: 600,
                      minWidth: isMobile ? 48 : 'auto',
                      px: isMobile ? 1 : 2,
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isMobile ? '🏷️' : 'Etiquetas'}
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
