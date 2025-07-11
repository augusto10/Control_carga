import { Container, Typography, Box, Card, CardContent, CardActionArea, Grid, CircularProgress } from '@mui/material';
import Link from 'next/link';
import {
  Add as AddIcon,
  NoteAdd as NoteAddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type MenuCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

function HomeContent() {
  const menuCards: MenuCard[] = [
    {
      title: 'Adicionar Notas',
      description: 'Adicione novas notas fiscais ao sistema',
      icon: <NoteAddIcon sx={{ fontSize: 40 }} />,
      href: '/adicionar-notas',
      color: '#1976d2',
    },
    {
      title: 'Criar Controle',
      description: 'Crie um novo controle de cargas',
      icon: <AddIcon sx={{ fontSize: 40 }} />,
      href: '/criar-controle',
      color: '#2e7d32',
    },
    {
      title: 'Consultar Notas',
      description: 'Consulte notas fiscais cadastradas',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      href: '/listar-notas',
      color: '#ed6c02',
    },
    {
      title: 'Consultar Controles',
      description: 'Consulte os controles de cargas existentes',
      icon: <ListAltIcon sx={{ fontSize: 40 }} />,
      href: '/listar-controles',
      color: '#9c27b0',
    },
    {
      title: 'Separação e Conferência',
      description: 'Acesse funções de separação, conferência, auditoria e gerência',
      icon: <ListAltIcon sx={{ fontSize: 40 }} />,
      href: '/separacao-conferencia',
      color: '#00796b',
    },
    {
      title: 'Checklist Empilhadeiras',
      description: 'Checklist rápido e obrigatório para operadores',
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 40 }} />,
      href: '/checklist-empilhadeiras',
      color: '#fbc02d',
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Controle de Cargas Esplendor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Sistema de gerenciamento de cargas e notas fiscais
        </Typography>
      </Box>

      <Grid container spacing={3} alignItems="stretch" justifyContent="center" sx={{ mt: 2 }}>
        {menuCards.map((card) => (
          <Grid item xs={12} sm={6} key={card.title} sx={{ display: 'flex' }}>
            <Link href={card.href} passHref style={{ textDecoration: 'none', width: '100%', height: '100%' }}>
              <Card
                sx={{
                  width: '100%',
                  minHeight: { xs: 120, sm: 140, md: 160 },
                  maxWidth: 380,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 3,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  background: '#ff9800',
                  p: { xs: 1.5, sm: 2 },
                  gap: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.17)',
                  },
                }}
              >
                <Box sx={{
                  minWidth: 48,
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.09)',
                  mr: { xs: 1.5, sm: 2 },
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                }}>
                  <Box sx={{ color: '#fff', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {card.icon}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 0.5, textAlign: 'left', fontSize: { xs: 15, sm: 17 } }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', textAlign: 'left', fontSize: { xs: 12, sm: 13 } }}>
                    {card.description}
                  </Typography>
                </Box>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isCheckingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <HomeContent />;
}
