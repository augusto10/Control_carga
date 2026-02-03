import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Container,
  Stack,
  alpha,
  Paper,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  GetApp as DownloadIcon,
  NotificationsActive as NotificationsIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ResponsiveContainer from '../components/ResponsiveContainer';
import ProtectedRoute from '../components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <AnimatePresence mode="wait">
        {value === index && (
          <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            sx={{ py: 4 }}
          >
            {children}
          </MotionBox>
        )}
      </AnimatePresence>
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const PainelGerencial: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dados mockados para demonstração
  const [dashboardData, setDashboardData] = useState({
    controlesFinalizados: 45,
    controlesPendentes: 12,
    totalUsuarios: 28,
    totalMotoristas: 15,
    notasProcessadas: 234,
    etiquetasGeradas: 156
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      user: 'João Silva',
      action: 'Finalizou controle de carga',
      time: '2 horas atrás',
      type: 'success'
    },
    {
      id: 2,
      user: 'Maria Santos',
      action: 'Criou novo checklist',
      time: '3 horas atrás',
      type: 'info'
    },
    {
      id: 3,
      user: 'Pedro Costa',
      action: 'Gerou etiquetas',
      time: '5 horas atrás',
      type: 'info'
    }
  ]);

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!user || user.tipo !== 'ADMIN') {
    return (
      <Layout title="Acesso Negado">
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <MotionPaper
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}
          >
            <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Acesso Restrito
            </Typography>
            <Typography color="text.secondary" mb={3}>
              Você não tem permissões administrativas para acessar o Painel Gerencial.
            </Typography>
            <Button variant="contained" href="/" sx={{ borderRadius: 2 }}>
              Voltar ao Início
            </Button>
          </MotionPaper>
        </Container>
      </Layout>
    );
  }

  const StatCard = ({ title, value, icon, color, delay }: any) => (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      sx={{
        height: '100%',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: `${color}.main` }} />
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="overline" color="text.secondary" fontWeight="700" sx={{ letterSpacing: 1 }}>
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: alpha(theme.palette[color].main, 0.1), color: `${color}.main`, borderRadius: 2 }}>
            {icon}
          </Avatar>
        </Stack>
        <Typography variant="h3" fontWeight="800" color="#1e293b">
          {value}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
          <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" color="success.main" fontWeight="600">
            +5% desde ontem
          </Typography>
        </Stack>
      </CardContent>
    </MotionCard>
  );

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Painel Gerencial' }
        ]}
      >
        {/* Header Section */}
        <Box mb={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight="800" color="#1e293b" gutterBottom>
                Painel Gerencial
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Visão estratégica e monitoramento de atividades em tempo real.
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 'bold' }}
            >
              Atualizar Dados
            </Button>
          </Stack>
        </Box>

        {/* Tabs Section */}
        <MotionPaper
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            borderRadius: 4,
            mb: 4,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': { py: 2.5, fontWeight: '700', fontSize: '0.9rem', textTransform: 'none' }
            }}
          >
            <Tab label="Dashboard" icon={<TrendingUpIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Atividades" icon={<NotificationsIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Relatórios" icon={<DescriptionIcon />} iconPosition="start" {...a11yProps(2)} />
            <Tab label="Configurações" icon={<SettingsIcon />} iconPosition="start" {...a11yProps(3)} />
          </Tabs>
        </MotionPaper>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Controles Finalizados" 
                value={dashboardData.controlesFinalizados} 
                icon={<CheckCircleIcon />} 
                color="success" 
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Controles Pendentes" 
                value={dashboardData.controlesPendentes} 
                icon={<WarningIcon />} 
                color="warning" 
                delay={0.2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Total de Usuários" 
                value={dashboardData.totalUsuarios} 
                icon={<PersonIcon />} 
                color="primary" 
                delay={0.3}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Etiquetas Geradas" 
                value={dashboardData.etiquetasGeradas} 
                icon={<AssignmentIcon />} 
                color="info" 
                delay={0.4}
              />
            </Grid>

            {/* Additional Charts or Info could go here */}
            <Grid item xs={12}>
              <MotionPaper
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  textAlign: 'center',
                  background: alpha(theme.palette.primary.main, 0.02),
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  Métricas de Produtividade
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Gráficos detalhados de desempenho por período serão exibidos nesta seção em breve.
                </Typography>
              </MotionPaper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <MotionPaper
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
            }}
          >
            <Box p={3} bgcolor={alpha(theme.palette.primary.main, 0.03)} borderBottom={`1px solid ${alpha(theme.palette.divider, 0.5)}`}>
              <Typography variant="h6" fontWeight="bold">Fluxo de Atividades</Typography>
            </Box>
            <List disablePadding>
              <AnimatePresence>
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListItem sx={{ py: 2.5, px: 3, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette[activity.type === 'success' ? 'success' : 'info'].main, 0.1), color: `${activity.type === 'success' ? 'success' : 'info'}.main` }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography fontWeight="700">{activity.action}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{activity.user} • {activity.time}</Typography>}
                      />
                      <Chip 
                        label={activity.type === 'success' ? 'Concluído' : 'Processando'} 
                        color={activity.type === 'success' ? 'success' : 'info'}
                        size="small"
                        sx={{ fontWeight: 'bold', borderRadius: 1.5 }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          </MotionPaper>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MotionPaper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
                }}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom>Exportação de Dados</Typography>
                <Stack spacing={2} mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 3, justifyContent: 'flex-start', px: 3 }}
                  >
                    Relatório de Controles (PDF/Excel)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 3, justifyContent: 'flex-start', px: 3 }}
                  >
                    Relatório de Usuários (CSV)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 3, justifyContent: 'flex-start', px: 3 }}
                  >
                    Logs de Acesso do Sistema
                  </Button>
                </Stack>
              </MotionPaper>
            </Grid>

            <Grid item xs={12} md={6}>
              <MotionPaper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
                }}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom>Resumo Mensal</Typography>
                <Alert 
                  severity="info" 
                  variant="standard"
                  sx={{ 
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    backgroundColor: alpha(theme.palette.info.main, 0.15),
                    color: theme.palette.info.dark,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                    '& .MuiAlert-icon': {
                      color: theme.palette.info.main,
                    },
                    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                    fontWeight: 600,
                    mb: 3
                  }}
                >
                  Consolidação automática de dados ativa.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  O sistema gera automaticamente resumos estatísticos ao final de cada mês para auxiliar na tomada de decisão.
                </Typography>
              </MotionPaper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <MotionPaper
            sx={{
              p: 4,
              borderRadius: 4,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
            }}
          >
            <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', mx: 'auto', mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Configurações Avançadas
            </Typography>
            <Typography color="text.secondary" mb={3} maxWidth={500} mx="auto">
              Utilize o menu lateral para acessar as configurações detalhadas de usuários, motoristas e parâmetros globais do sistema.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" href="/admin/configuracoes" sx={{ borderRadius: 2, px: 4 }}>
                Acessar Configurações
              </Button>
              <Button variant="outlined" href="/admin/usuarios" sx={{ borderRadius: 2, px: 4 }}>
                Gerenciar Usuários
              </Button>
            </Stack>
          </MotionPaper>
        </TabPanel>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
};

export default PainelGerencial;
