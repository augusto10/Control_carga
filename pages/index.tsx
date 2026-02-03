import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Today as TodayIcon,
  Inventory as InventoryIcon,
  PendingActions as PendingIcon,
  CheckCircleOutline as CompletedIcon,
  NotificationsNone as AlertNoneIcon
} from '@mui/icons-material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MenuCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

type KPIData = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
};

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);

function HomeContent() {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    notasHoje: 0,
    controlesAtivos: 0,
    checklistsPendentes: 0,
    alertasValidade: 0
  });

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      // Simulando busca de dados (pode ser substituído por chamadas API reais)
      // Como as APIs de dashboard existentes são restritas a ADMIN, 
      // aqui faremos uma versão simplificada ou mockada para o usuário comum
      const resControles = await fetch('/api/controles', { credentials: 'include' });
      const controles = resControles.ok ? await resControles.json() : [];
      
      const resNotas = await fetch('/api/notas', { credentials: 'include' });
      const notas = resNotas.ok ? await resNotas.json() : [];

      setStats({
        notasHoje: notas.filter((n: any) => {
          const hoje = new Date().toISOString().split('T')[0];
          return n.dataCriacao?.startsWith(hoje);
        }).length || 0,
        controlesAtivos: controles.filter((c: any) => !c.finalizado).length || 0,
        checklistsPendentes: 12, // Mock ou buscar de API específica
        alertasValidade: 5 // Mock ou buscar de API específica
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const kpis: KPIData[] = [
    { 
      label: 'Notas de Hoje', 
      value: stats.notasHoje, 
      icon: <NoteAddIcon />, 
      color: '#2196f3',
      trend: '+12% vs ontem'
    },
    { 
      label: 'Controles Ativos', 
      value: stats.controlesAtivos, 
      icon: <ListAltIcon />, 
      color: '#4caf50',
      trend: 'Em tempo real'
    },
    { 
      label: 'Checklists Pendentes', 
      value: stats.checklistsPendentes, 
      icon: <AssignmentTurnedInIcon />, 
      color: '#ff9800',
      trend: 'Urgente'
    },
    { 
      label: 'Alertas Validade', 
      value: stats.alertasValidade, 
      icon: <AlertIcon />, 
      color: '#f44336',
      trend: 'Atenção'
    }
  ];

  const menuCards: MenuCard[] = [
    {
      title: 'Adicionar Notas',
      description: 'Entrada de novas NFs',
      icon: <NoteAddIcon sx={{ fontSize: 32 }} />,
      href: '/adicionar-notas',
      color: '#1976d2',
    },
    {
      title: 'Criar Controle',
      description: 'Novo controle de carga',
      icon: <AddIcon sx={{ fontSize: 32 }} />,
      href: '/criar-controle',
      color: '#2e7d32',
    },
    {
      title: 'Consultar Notas',
      description: 'Busca e histórico de NFs',
      icon: <SearchIcon sx={{ fontSize: 32 }} />,
      href: '/listar-notas',
      color: '#ed6c02',
    },
    {
      title: 'Consultar Controles',
      description: 'Status de carregamentos',
      icon: <ListAltIcon sx={{ fontSize: 32 }} />,
      href: '/listar-controles',
      color: '#9c27b0',
    },
    {
      title: 'Checklist Empilhadeiras',
      description: 'Inspeção obrigatória',
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 32 }} />,
      href: '/checklist-empilhadeiras',
      color: '#fbc02d',
    },
    {
      title: 'Gerar Etiquetas',
      description: 'ZPL e Código de Barras',
      icon: <EtiquetasIcon sx={{ fontSize: 32 }} />,
      href: '/gerar-etiquetas',
      color: '#d32f2f',
    },
    {
      title: 'Recebimento',
      description: 'Checklist e Regras de Ouro',
      icon: <ChecklistIcon sx={{ fontSize: 32 }} />,
      href: '/checklist-recebimento/regras-ouro',
      color: '#7b1fa2',
    },
    {
      title: 'Relatórios',
      description: 'Indicadores e análises',
      icon: <ReportIcon sx={{ fontSize: 32 }} />,
      href: '/checklist-recebimento/relatorios',
      color: '#0288d1',
    }
  ];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ px: isMobile ? 2 : 4, py: isMobile ? 2 : 4, minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Welcome Header */}
      <MotionBox 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
              {`${getGreeting()}, ${user?.nome ? user.nome.split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'Usuário')} 👋`}
            </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TodayIcon sx={{ fontSize: 18 }} />
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar dados">
            <IconButton 
              onClick={loadDashboardStats}
              sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              <RefreshIcon sx={{ color: '#64748b' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </MotionBox>

      {/* KPI Section */}
      <MotionGrid container spacing={3} sx={{ mb: 6 }} variants={containerVariants} initial="hidden" animate="visible">
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MotionBox variants={itemVariants}>
              <Card sx={{ 
                borderRadius: 4, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
                position: 'relative',
                bgcolor: 'white'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 3, 
                      bgcolor: `${kpi.color}10`, 
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {kpi.icon}
                    </Box>
                    {loadingStats ? (
                      <CircularProgress size={20} sx={{ color: '#cbd5e1' }} />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        {kpi.trend}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                    {loadingStats ? '...' : kpi.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                    {kpi.label}
                  </Typography>
                </CardContent>
              </Card>
            </MotionBox>
          </Grid>
        ))}
      </MotionGrid>

      <Divider sx={{ mb: 6, opacity: 0.6 }} />

      {/* Quick Access Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 4, height: 24, bgcolor: '#1976d2', borderRadius: 2 }} />
          Acesso Rápido
        </Typography>

        <MotionGrid container spacing={3} variants={containerVariants} initial="hidden" animate="visible">
          {menuCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <MotionBox variants={itemVariants} whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link href={card.href} style={{ textDecoration: 'none' }}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 4,
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: 'white',
                    '&:hover': {
                      boxShadow: '0 12px 24px rgba(0,0,0,0.06)',
                      borderColor: card.color,
                      '& .icon-wrapper': {
                        bgcolor: card.color,
                        color: 'white',
                        transform: 'rotate(-5deg) scale(1.1)'
                      }
                    }
                  }}>
                    <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                      <Box 
                        className="icon-wrapper"
                        sx={{ 
                          width: 56, 
                          height: 56, 
                          borderRadius: 3, 
                          bgcolor: `${card.color}08`, 
                          color: card.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.2 }}>
                          {card.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          {card.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Link>
              </MotionBox>
            </Grid>
          ))}
        </MotionGrid>
      </Box>

      {/* Footer / Status Bar */}
      <MotionBox 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        sx={{ mt: 8, p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)', border: '1px dashed #e2e8f0', textAlign: 'center' }}
      >
        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
          Sistema de Controle de Cargas • Versão 2.0.0 • Esplendor Logística
        </Typography>
      </MotionBox>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f8fafc' }}>
        <CircularProgress thickness={4} size={48} sx={{ color: '#1976d2' }} />
      </Box>
    );
  }

  return <HomeContent />;
}
