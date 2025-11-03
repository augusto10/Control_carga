import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';

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
        <Box sx={{ p: 3 }}>
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
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!user || user.tipo !== 'ADMIN') {
    return (
      <Layout title="Acesso Negado">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Você não tem permissão para acessar esta página.
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Painel Gerencial">
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="painel gerencial tabs"
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
            <Tab label="Dashboard" {...a11yProps(0)} />
            <Tab label="Atividades" {...a11yProps(1)} />
            <Tab label="Relatórios" {...a11yProps(2)} />
            <Tab label="Configurações" {...a11yProps(3)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h4" gutterBottom>
            Dashboard Executivo
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Controles Finalizados
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.controlesFinalizados}
                      </Typography>
                    </Box>
                    <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Controles Pendentes
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.controlesPendentes}
                      </Typography>
                    </Box>
                    <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total de Usuários
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.totalUsuarios}
                      </Typography>
                    </Box>
                    <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Etiquetas Geradas
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.etiquetasGeradas}
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom>
            Atividades Recentes
          </Typography>
          
          <Card>
            <CardContent>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.action}
                        secondary={`${activity.user} • ${activity.time}`}
                      />
                      <Chip 
                        label={activity.type === 'success' ? 'Concluído' : 'Ativo'} 
                        color={activity.type === 'success' ? 'success' : 'info'}
                        size="small"
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom>
            Relatórios Gerenciais
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Relatórios Disponíveis" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      fullWidth
                    >
                      Relatório de Controles
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      fullWidth
                    >
                      Relatório de Usuários
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      fullWidth
                    >
                      Relatório de Checklists
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Estatísticas" />
                <CardContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Dados atualizados em tempo real
                  </Alert>
                  <Typography variant="body1" color="text.secondary">
                    Visualize métricas detalhadas e tendências do sistema.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom>
            Configurações do Sistema
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Configurações avançadas disponíveis no menu lateral.
          </Alert>
          
          <Typography variant="body1" color="text.secondary">
            Acesse as configurações através do menu lateral para gerenciar usuários, 
            motoristas e outras configurações do sistema.
          </Typography>
        </TabPanel>
      </Box>
    </Layout>
  );
};

export default PainelGerencial;
