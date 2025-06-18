import { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Avatar, 
  IconButton, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Divider,
  LinearProgress,
  useTheme
} from '@mui/material';
import { 
  People as PeopleIcon, 
  Assignment as AssignmentIcon, 
  CheckCircle as CheckCircleIcon, 
  Pending as PendingIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../services/api';

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalControles: number;
  controlesFinalizados: number;
  controlesPendentes: number;
  ultimosUsuarios: Array<{
    id: string;
    nome: string;
    email: string;
    ultimoAcesso: string | null;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'primary',
    loading: isLoading 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    loading?: boolean;
  }) => (
    <Card>
      <CardContent>
        {isLoading ? (
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography color="textSecondary" gutterBottom>
                {title}
              </Typography>
              <Avatar 
                sx={{ 
                  backgroundColor: `${color}.light`, 
                  color: `${color}.contrastText`,
                  width: 48,
                  height: 48
                }}
              >
                {icon}
              </Avatar>
            </Box>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="Visão Geral">
      <Grid container spacing={3}>
        {/* Cards de Estatísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total de Usuários" 
            value={stats?.totalUsuarios || 0} 
            icon={<PeopleIcon />}
            color="primary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Usuários Ativos" 
            value={stats?.usuariosAtivos || 0} 
            icon={<CheckCircleIcon />}
            color="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Controles Totais" 
            value={stats?.totalControles || 0} 
            icon={<AssignmentIcon />}
            color="info"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Controles Pendentes" 
            value={stats?.controlesPendentes || 0} 
            icon={<PendingIcon />}
            color="warning"
            loading={loading}
          />
        </Grid>

        {/* Últimos Usuários */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Últimos Usuários</Typography>
              <IconButton size="small" onClick={loadStats} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider />
            {loading ? (
              <Box p={2}>
                <LinearProgress />
              </Box>
            ) : (
              <List>
                {stats?.ultimosUsuarios.length ? (
                  stats.ultimosUsuarios.map((usuario) => (
                    <div key={usuario.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            {usuario.nome.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={usuario.nome}
                          secondary={`Último acesso: ${
                            usuario.ultimoAcesso 
                              ? new Date(usuario.ultimoAcesso).toLocaleString() 
                              : 'Nunca acessou'
                          }`}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </div>
                  ))
                ) : (
                  <Box p={2} textAlign="center">
                    <Typography color="textSecondary">Nenhum usuário encontrado</Typography>
                  </Box>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Atividades Recentes */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box p={2}>
              <Typography variant="h6">Atividades Recentes</Typography>
            </Box>
            <Divider />
            <Box p={2}>
              <Typography color="textSecondary" align="center" sx={{ my: 4 }}>
                Em breve: Atividades recentes do sistema
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
