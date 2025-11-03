import { Container, Typography, Box, Card, CardContent, Grid, CircularProgress, Paper, Chip, Avatar, useTheme, useMediaQuery } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Add as AddIcon,
  NoteAdd as NoteAddIcon,
  Search as SearchIcon,
  LocalShipping as EtiquetasIcon,
  Assignment as ChecklistIcon,
  Assessment as ReportIcon,
  Warning as AlertIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useAuth } from '../contexts/AuthContext';

type MenuCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

function HomeContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
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
    },
    {
      title: 'Gerar Etiquetas',
      description: 'Gere etiquetas de transporte com código de barras',
      icon: <EtiquetasIcon sx={{ fontSize: 40 }} />,
      href: '/gerar-etiquetas',
      color: '#d32f2f',
    },
    {
      title: 'Checklist Recebimento',
      description: 'Checklist para recebimento de produtos com vencimento',
      icon: <ChecklistIcon sx={{ fontSize: 40 }} />,
      href: '/checklist-recebimento/regras-ouro',
      color: '#7b1fa2',
    },
    {
      title: 'Relatórios Checklist',
      description: 'Visualize relatórios completos dos checklists',
      icon: <ReportIcon sx={{ fontSize: 40 }} />,
      href: '/checklist-recebimento/relatorios',
      color: '#0288d1',
    },
    {
      title: 'Alertas de Validade',
      description: 'Monitore produtos próximos ao vencimento',
      icon: <AlertIcon sx={{ fontSize: 40 }} />,
      href: '/checklist-recebimento/relatorio-validade',
      color: '#f57c00',
    },
    {
      title: 'Relatórios Avançados',
      description: 'Análises detalhadas de validade e ocorrências',
      icon: <ReportIcon sx={{ fontSize: 40 }} />,
      href: '/checklist-recebimento/relatorios-avancados',
      color: '#9c27b0',
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ px: isMobile ? 2 : 4, py: isMobile ? 2 : 4 }}>
        {/* Header Hero Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            p: isMobile ? 2.5 : 3.5,
            mb: 4,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
              borderRadius: '50%'
            }
          }}
        >
        <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)', 
                width: isMobile ? 60 : 80, 
                height: isMobile ? 60 : 80,
                mx: 'auto',
                mb: 2,
                boxShadow: '0 4px 16px rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.2)'
              }}
            >
              <SpeedIcon sx={{ fontSize: isMobile ? 30 : 40, color: 'white' }} />
            </Avatar>
            <Typography 
              variant={isMobile ? "h4" : "h2"} 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                color: 'white'
              }}
            >
              Controle de Cargas
            </Typography>
            <Typography 
              variant={isMobile ? "h6" : "h4"} 
              sx={{ 
                fontWeight: 300, 
                opacity: 0.9, 
                mb: 2,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              Esplendor
            </Typography>
          </Box>
          
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            sx={{ 
              opacity: 0.95, 
              fontWeight: 400, 
              mb: 3,
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.5
            }}
          >
            Sistema inteligente de gerenciamento logístico
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip 
              icon={<SecurityIcon sx={{ fontSize: 16 }} />} 
              label="Seguro" 
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 500,
                fontSize: '0.75rem'
              }} 
            />
            <Chip 
              icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} 
              label="Eficiente" 
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 500,
                fontSize: '0.75rem'
              }} 
            />
            <Chip 
              icon={<SpeedIcon sx={{ fontSize: 16 }} />} 
              label="Rápido" 
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 500,
                fontSize: '0.75rem'
              }} 
            />
          </Box>
        </Box>
      </Paper>

        {/* Cards Grid */}
        <Box sx={{ mt: 2 }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h2" 
            sx={{ 
              textAlign: 'center', 
              mb: 4, 
              fontWeight: 700,
              color: 'text.primary'
            }}
          >
            Acesso Rápido
          </Typography>
          
          <Grid 
            container 
            spacing={isMobile ? 2 : 3} 
            justifyContent="center"
            sx={{ maxWidth: 1400, mx: 'auto' }}
          >
            {menuCards.map((card) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                lg={3}
                key={card.title} 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <Link href={card.href} passHref style={{ textDecoration: 'none', width: '100%', maxWidth: 320 }}>
              <Card
                sx={{
                  width: '100%',
                  minHeight: isMobile ? 120 : 140,
                  maxWidth: isMobile ? '100%' : 320,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  '&:hover': {
                    transform: isMobile ? 'scale(1.02)' : 'translateY(-4px)',
                    boxShadow: `0 8px 25px rgba(0,0,0,0.12)`,
                    borderColor: card.color,
                    '& .card-icon': {
                      transform: 'scale(1.05)',
                      backgroundColor: `${card.color}15`
                    },
                    '& .card-title': {
                      color: card.color
                    },
                    '&::before': {
                      opacity: 1
                    }
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${card.color} 0%, ${card.color}80 100%)`,
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  }
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    p: isMobile ? 2 : 2.5,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <Box
                    className="card-icon"
                    sx={{
                      color: card.color,
                      mb: 1.5,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isMobile ? 48 : 56,
                      height: isMobile ? 48 : 56,
                      borderRadius: '50%',
                      background: `${card.color}08`,
                      border: `1px solid ${card.color}20`
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography
                    className="card-title"
                    variant="subtitle1"
                    component="h2"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 0.5,
                      fontSize: isMobile ? '0.95rem' : '1rem',
                      transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      lineHeight: 1.3
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.8rem',
                      lineHeight: 1.4,
                      textAlign: 'center',
                      fontWeight: 400,
                      opacity: 0.7
                    }}
                  >
                    {card.description}
                  </Typography>
                </CardContent>
              </Card>
            </Link>
              </Grid>
            ))}
          </Grid>
        </Box>
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
