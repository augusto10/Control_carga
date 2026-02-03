import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar, 
  IconButton, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Divider,
  LinearProgress,
  Stack,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { 
  People as PeopleIcon, 
  Assignment as AssignmentIcon, 
  CheckCircle as CheckCircleIcon, 
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminRoute from '../../components/admin/AdminRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionGrid = motion(Grid);

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalControles: number;
  controlesFinalizados: number;
  controlesPendentes: number;
  pedidosHoje: number;
  pedidosMes: number;
  ultimosUsuarios: Array<{
    id: string;
    nome: string;
    email: string;
    ultimoAcesso: string | null;
  }>;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);


  const loadStats = async () => {
    try {
      setLoading(true);
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const primeiroDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

      // Buscar dados reais de diferentes endpoints
      const [usuariosRes, controlesRes, pedidosHojeRes, pedidosMesRes] = await Promise.all([
        fetch('/api/admin/usuarios', { credentials: 'include' }),
        fetch('/api/controles', { credentials: 'include' }),
        fetch(`/api/pedidos/externos?limit=10000&offset=0&data_inicio=${hoje}&data_fim=${hoje}`, { credentials: 'include' }),
        fetch(`/api/pedidos/externos?limit=10000&offset=0&data_inicio=${primeiroDiaMes}&data_fim=${hoje}`, { credentials: 'include' })
      ]);

      const statsData: DashboardStats = {
        totalUsuarios: 0,
        usuariosAtivos: 0,
        totalControles: 0,
        controlesFinalizados: 0,
        controlesPendentes: 0,
        pedidosHoje: 0,
        pedidosMes: 0,
        ultimosUsuarios: []
      };

      // Processar dados de usuários
      if (usuariosRes.ok) {
        const usuarios = await usuariosRes.json();
        statsData.totalUsuarios = usuarios.length;
        statsData.usuariosAtivos = usuarios.filter((u: any) => u.ativo).length;
        statsData.ultimosUsuarios = usuarios
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((u: any) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            ultimoAcesso: u.updatedAt
          }));
      }

      // Processar dados de controles
      if (controlesRes.ok) {
        const controles = await controlesRes.json();
        statsData.totalControles = controles.length;
        statsData.controlesFinalizados = controles.filter((c: any) => c.finalizado).length;
        statsData.controlesPendentes = controles.filter((c: any) => !c.finalizado).length;
      }

      // Processar dados de pedidos
      const filtrarPedidos = (lista: any[]) => {
        if (!Array.isArray(lista)) return 0;
        return lista.filter(p => {
          const fechado = String(p.PEDIDO_FECHADO || '').toUpperCase() === 'S';
          const isEntrega = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
          return fechado && isEntrega;
        }).length;
      };

      if (pedidosHojeRes.ok) {
        const data = await pedidosHojeRes.json();
        if (data.error) {
          console.error('[Dashboard] Erro ao carregar pedidos de hoje:', data.error);
          statsData.pedidosHoje = 0;
        } else {
          statsData.pedidosHoje = filtrarPedidos(data.data || []);
        }
      }

      if (pedidosMesRes.ok) {
        const data = await pedidosMesRes.json();
        if (data.error) {
          console.error('[Dashboard] Erro ao carregar pedidos do mês:', data.error);
          statsData.pedidosMes = 0;
        } else {
          statsData.pedidosMes = filtrarPedidos(data.data || []);
        }
      }

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Atualizar dados automaticamente a cada 3 minutos
    const interval = setInterval(() => {
      loadStats();
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const theme = useTheme();

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'primary',
    loading: isLoading,
    delay = 0 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    loading?: boolean;
    delay?: number;
  }) => (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      sx={{
        height: '100%',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '4px', 
        height: '100%', 
        bgcolor: `${color}.main` 
      }} />
      <CardContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="700" sx={{ letterSpacing: 1 }}>
                  {title}
                </Typography>
                <Typography variant="h3" component="div" fontWeight="800" sx={{ color: '#1e293b', mt: 0.5 }}>
                  {value}
                </Typography>
              </Box>
              <Avatar 
                sx={{ 
                  backgroundColor: alpha(theme.palette[color].main, 0.1), 
                  color: `${color}.main`,
                  width: 56,
                  height: 56,
                  borderRadius: 3
                }}
              >
                {icon}
              </Avatar>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" color="success.main" fontWeight="600">
                +12% este mês
              </Typography>
            </Box>
          </Stack>
        )}
      </CardContent>
    </MotionCard>
  );

  return (
    <AdminLayout title="Dashboard Administrativo">
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="800" color="#1e293b" gutterBottom>
            Bem-vindo ao Painel Admin
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Acompanhe as métricas principais e atividades recentes do sistema.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Cards de Estatísticas */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Total de Usuários" 
              value={stats?.totalUsuarios || 0} 
              icon={<PeopleIcon sx={{ fontSize: 30 }} />}
              color="primary"
              loading={loading}
              delay={0.1}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Usuários Ativos" 
              value={stats?.usuariosAtivos || 0} 
              icon={<CheckCircleIcon sx={{ fontSize: 30 }} />}
              color="success"
              loading={loading}
              delay={0.2}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Controles Totais" 
              value={stats?.totalControles || 0} 
              icon={<AssignmentIcon sx={{ fontSize: 30 }} />}
              color="info"
              loading={loading}
              delay={0.3}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Controles Pendentes" 
              value={stats?.controlesPendentes || 0} 
              icon={<PendingIcon sx={{ fontSize: 30 }} />}
              color="warning"
              loading={loading}
              delay={0.4}
            />
          </Grid>

          {/* Pedidos Fechados */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Pedidos de Hoje (Fechados)" 
              value={stats?.pedidosHoje || 0} 
              icon={<CheckCircleIcon sx={{ fontSize: 30 }} />}
              color="success"
              loading={loading}
              delay={0.5}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Pedidos do Mês (Fechados)" 
              value={stats?.pedidosMes || 0} 
              icon={<CalendarMonthIcon sx={{ fontSize: 30 }} />}
              color="info"
              loading={loading}
              delay={0.6}
            />
          </Grid>

          {/* Últimos Usuários */}
          <Grid item xs={12} md={7}>
            <MotionPaper
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              sx={{
                p: 0,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}
            >
              <Box p={3} display="flex" justifyContent="space-between" alignItems="center" bgcolor="rgba(25, 118, 210, 0.03)">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 2, color: 'white', display: 'flex' }}>
                    <PeopleIcon fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="700">Últimos Usuários</Typography>
                </Stack>
                <Tooltip title="Atualizar dados">
                  <IconButton size="small" onClick={loadStats} disabled={loading} sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' } }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ opacity: 0.5 }} />
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {loading ? (
                  <Box p={4} textAlign="center">
                    <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />
                    <Typography color="text.secondary">Carregando usuários...</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    <AnimatePresence>
                      {stats?.ultimosUsuarios.length ? (
                        stats.ultimosUsuarios.map((usuario, index) => (
                          <motion.div
                            key={usuario.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                          >
                            <ListItem sx={{ 
                              px: 3, 
                              py: 2, 
                              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.02)' },
                              transition: 'background-color 0.2s'
                            }}>
                              <ListItemAvatar>
                                <Avatar sx={{ 
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.main',
                                  fontWeight: 'bold',
                                  width: 45,
                                  height: 45
                                }}>
                                  {usuario.nome.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" fontWeight="700" color="#1e293b">
                                    {usuario.nome}
                                  </Typography>
                                }
                                secondary={
                                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                    <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {usuario.ultimoAcesso 
                                        ? `Acesso em ${new Date(usuario.ultimoAcesso).toLocaleString()}` 
                                        : 'Sem acessos registrados'}
                                    </Typography>
                                  </Stack>
                                }
                              />
                              <IconButton size="small">
                                <ArrowForwardIcon fontSize="small" color="action" />
                              </IconButton>
                            </ListItem>
                            {index < stats.ultimosUsuarios.length - 1 && <Divider variant="inset" sx={{ opacity: 0.5 }} />}
                          </motion.div>
                        ))
                      ) : (
                        <Box p={8} textAlign="center">
                          <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
                          <Typography color="text.secondary" fontWeight="500">Nenhum usuário encontrado</Typography>
                        </Box>
                      )}
                    </AnimatePresence>
                  </List>
                )}
              </Box>
            </MotionPaper>
          </Grid>

          {/* Atividades Recentes */}
          <Grid item xs={12} md={5}>
            <MotionPaper
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              sx={{
                p: 0,
                height: '100%',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}
            >
              <Box p={3} bgcolor="rgba(25, 118, 210, 0.03)">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ p: 1, bgcolor: 'secondary.main', borderRadius: 2, color: 'white', display: 'flex' }}>
                    <AssignmentIcon fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="700">Atividades do Sistema</Typography>
                </Stack>
              </Box>
              <Divider sx={{ opacity: 0.5 }} />
              <Box p={4} sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  bgcolor: 'rgba(0,0,0,0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <AccessTimeIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.3 }} />
                </Box>
                <Typography variant="h6" color="text.secondary" fontWeight="600" gutterBottom>
                  Em Breve
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 250, margin: '0 auto' }}>
                  O registro detalhado de atividades e logs do sistema será exibido aqui em uma atualização futura.
                </Typography>
              </Box>
            </MotionPaper>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}
