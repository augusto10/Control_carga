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
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Container,
  Stack,
  Paper,
  useMediaQuery
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
import { AppLayout } from '../components/layout/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';



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
      {value === index && (
        <Box sx={{ py: 4 }}>
          {children}
        </Box>
      )}
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
  const isMobile = useMediaQuery('(max-width:900px)');
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    controlesFinalizados: 0,
    controlesPendentes: 0,
    totalUsuarios: 0,
    totalMotoristas: 0,
    notasProcessadas: 0,
    etiquetasGeradas: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, activitiesRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/atividades-recentes')
      ]);

      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json();
        setDashboardData(dashboard);
      }

      if (activitiesRes.ok) {
        const activities = await activitiesRes.json();
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!user || user.tipo !== 'ADMIN') {
    return (
      
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
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
            </Paper>
        </Container>
      
    );
  }

const StatCard = ({ title, value, icon, color }: any) => (
  <Card sx={{ height: '100%', borderRadius: 2 }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="overline" color="text.secondary" fontWeight="700" sx={{ letterSpacing: 1 }}>
          {title}
        </Typography>
        <Avatar sx={{ bgcolor: `${color}.main`, color: 'white', borderRadius: 2 }}>
          {icon}
        </Avatar>
      </Stack>
      <Typography variant="h3" fontWeight="800" color="text.primary">
        {loading ? '...' : value}
      </Typography>
      {!loading && (
        <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
          <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" color="success.main" fontWeight="600">
            Atualizado agora
          </Typography>
        </Stack>
      )}
    </CardContent>
  </Card>
);

  return (
    <ProtectedRoute>
      <AppLayout
        title="Painel Gerencial"
        subtitle="Visão estratégica e monitoramento de atividades em tempo real."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Painel Gerencial' }
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            {loading ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        }
      >
        <Container maxWidth="xl" sx={{ p: 0 }}>
        {/* Tabs Section */}
        <Paper sx={{ mb: 4, borderRadius: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { py: 2.5, fontWeight: '700', fontSize: '0.9rem', textTransform: 'none' }
            }}
          >
            <Tab label="Dashboard" icon={<TrendingUpIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Atividades" icon={<NotificationsIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Relatórios" icon={<DescriptionIcon />} iconPosition="start" {...a11yProps(2)} />
            <Tab label="Configurações" icon={<SettingsIcon />} iconPosition="start" {...a11yProps(3)} />
          </Tabs>
        </Paper>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Controles Finalizados"
                value={dashboardData.controlesFinalizados}
                icon={<CheckCircleIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Controles Pendentes"
                value={dashboardData.controlesPendentes}
                icon={<WarningIcon />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total de Usuários"
                value={dashboardData.totalUsuarios}
                icon={<PersonIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Etiquetas Geradas"
                value={dashboardData.etiquetasGeradas}
                icon={<AssignmentIcon />}
                color="info"
              />
            </Grid>

            {/* Additional Charts or Info could go here */}
            <Grid item xs={12}>
              <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  Métricas de Produtividade
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Gráficos detalhados de desempenho por período serão exibidos nesta seção em breve.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ borderRadius: 2 }}>
            <Box p={3} borderBottom={1} borderColor="divider">
              <Typography variant="h6" fontWeight="bold">Fluxo de Atividades</Typography>
            </Box>
            <List disablePadding>
              {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">Carregando atividades...</Typography>
                </Box>
              ) : recentActivity.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">Nenhuma atividade recente encontrada.</Typography>
                </Box>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={activity.id}>
                    <ListItem sx={{ py: 2.5, px: 3 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: `${activity.type === 'success' ? 'success' : 'info'}.main`, color: 'white' }}>
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
                        sx={{ fontWeight: 'bold' }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </div>
                ))
              )}
            </List>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Exportação de Dados</Typography>
                <Stack spacing={2} mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start', px: 3 }}
                  >
                    Relatório de Controles (PDF/Excel)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start', px: 3 }}
                  >
                    Relatório de Usuários (CSV)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start', px: 3 }}
                  >
                    Logs de Acesso do Sistema
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Resumo Mensal</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Consolidação automática de dados ativa.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  O sistema gera automaticamente resumos estatísticos ao final de cada mês para auxiliar na tomada de decisão.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'info.main', color: 'white', mx: 'auto', mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Configurações Avançadas
            </Typography>
            <Typography color="text.secondary" mb={3} maxWidth={500} mx="auto">
              Utilize o menu lateral para acessar as configurações detalhadas de usuários, motoristas e parâmetros globais do sistema.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" href="/admin/configuracoes">
                Acessar Configurações
              </Button>
              <Button variant="outlined" href="/admin/usuarios">
                Gerenciar Usuários
              </Button>
            </Stack>
          </Paper>
        </TabPanel>
        </Container>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default PainelGerencial;
PainelGerencial.usesAppLayout = true;
