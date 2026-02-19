import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  Stack,
  alpha,
  Avatar,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  History as HistoryIcon, 
  TrendingUp as TrendingUpIcon, 
  TrendingDown as TrendingDownIcon, 
  Person as PersonIcon, 
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const glassStyles = {
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
};

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
}

interface HistoricoItem {
  id: string;
  usuarioId: string;
  pedidoId: string | null;
  acao: string;
  pontosGanhos: number;
  descricao: string | null;
  dataAcao: string;
  usuario: Usuario;
}

function HistoricoPage() {
  const theme = useTheme();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      setRefreshing(true);
      const params: any = {};
      if (filtroUsuario) params.usuarioId = filtroUsuario;
      if (filtroAcao) params.acao = filtroAcao;
      
      const response = await api.get('/api/gamificacao/historico', { params });
      setHistorico(response.data.historico || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico de atividades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCorPontuacao = (pontos: number) => {
    if (pontos > 0) return '#10b981';
    if (pontos < 0) return '#ef4444';
    return '#94a3b8';
  };

  const getIconePontuacao = (pontos: number) => {
    if (pontos > 0) return <TrendingUpIcon sx={{ color: '#10b981' }} />;
    if (pontos < 0) return <TrendingDownIcon sx={{ color: '#ef4444' }} />;
    return <HistoryIcon sx={{ color: '#94a3b8' }} />;
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarAcao = (acao: string) => {
    const acoes: { [key: string]: string } = {
      'PEDIDO_CORRETO': 'Pedido Correto',
      'PEDIDO_INCORRETO': 'Pedido Incorreto',
      'BONUS_ADMIN': 'Bônus Administrativo',
      'PENALIDADE_ADMIN': 'Penalidade Administrativa'
    };
    return acoes[acao] || acao;
  };

  // Filtrar e paginar dados
  const historicoFiltrado = historico.filter(item => {
    const matchUsuario = !filtroUsuario || item.usuario.nome.toLowerCase().includes(filtroUsuario.toLowerCase());
    const matchAcao = !filtroAcao || item.acao === filtroAcao;
    return matchUsuario && matchAcao;
  });

  const totalPages = Math.ceil(historicoFiltrado.length / itemsPerPage);
  const historicoAtual = historicoFiltrado.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) {
    return (
      
        <Box sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary" fontWeight="500">
              Carregando histórico detalhado...
            </Typography>
          </Stack>
        </Box>
      
    );
  }

  return (
    <>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        pt: { xs: 2, md: 4 },
        pb: { xs: 4, md: 6 }
      }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ mb: 4 }}
          >
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={2.5}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 64, 
                  height: 64, 
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }}>
                  <HistoryIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, letterSpacing: '-0.02em' }}>
                    Histórico de Atividades
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight="500">
                    Acompanhe todos os registros de pontuação e ações
                  </Typography>
                </Box>
              </Stack>

              <Tooltip title="Atualizar histórico">
                <IconButton 
                  onClick={carregarHistorico} 
                  disabled={refreshing}
                  sx={{ 
                    bgcolor: 'white', 
                    '&:hover': { bgcolor: '#f1f5f9', transform: 'rotate(180deg)' }, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    p: 1.5
                  }}
                >
                  <RefreshIcon className={refreshing ? 'spin-animation' : ''} />
                </IconButton>
              </Tooltip>
            </Stack>
          </MotionBox>

          {error && (
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              sx={{ mb: 4 }}
            >
              <Alert 
                severity="error" 
                variant="standard"
                onClose={() => setError(null)}
                sx={{ 
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  backgroundColor: alpha(theme.palette.error.main, 0.15),
                  color: theme.palette.error.dark,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  '& .MuiAlert-icon': {
                    color: theme.palette.error.main,
                  },
                  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                  fontWeight: 600,
                }}
              >
                {error}
              </Alert>
            </MotionBox>
          )}

          {/* Filtros */}
          <MotionPaper 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            elevation={0}
            sx={{ 
              ...glassStyles,
              p: 4, 
              mb: 5, 
              borderRadius: '32px',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} mb={4}>
              <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: '10px', display: 'flex' }}>
                <FilterIcon sx={{ color: 'white' }} />
              </Box>
              <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ letterSpacing: '0.01em' }}>
                FILTROS DE BUSCA
              </Typography>
            </Stack>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome do Usuário"
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  placeholder="Pesquise por colaborador..."
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'primary.main', mr: 1.5, opacity: 0.7 }} />,
                    sx: { 
                      borderRadius: '16px',
                      bgcolor: 'rgba(255, 255, 255, 0.5)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Ação</InputLabel>
                  <Select
                    value={filtroAcao}
                    onChange={(e) => setFiltroAcao(e.target.value)}
                    label="Tipo de Ação"
                    sx={{ 
                      borderRadius: '16px',
                      bgcolor: 'rgba(255, 255, 255, 0.5)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' }
                    }}
                  >
                    <MenuItem value="">Todas as ações</MenuItem>
                    <MenuItem value="PEDIDO_CORRETO">Pedido Correto</MenuItem>
                    <MenuItem value="PEDIDO_INCORRETO">Pedido Incorreto</MenuItem>
                    <MenuItem value="BONUS_ADMIN">Bônus Admin</MenuItem>
                    <MenuItem value="PENALIDADE_ADMIN">Penalidade Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={`${historicoFiltrado.length} registros`} 
                size="small"
                sx={{ 
                  fontWeight: 700, 
                  bgcolor: alpha(theme.palette.primary.main, 0.1), 
                  color: 'primary.main',
                  borderRadius: '6px'
                }} 
              />
            </Box>
          </MotionPaper>

          {/* Lista do Histórico */}
          <Box>
            <AnimatePresence mode="popLayout">
              {historicoAtual.length === 0 ? (
                <MotionPaper
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  sx={{ 
                    p: 10, 
                    textAlign: 'center', 
                    borderRadius: '32px', 
                    bgcolor: 'rgba(255, 255, 255, 0.3)', 
                    border: '2px dashed rgba(226, 232, 240, 0.8)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <Box sx={{ mb: 3, opacity: 0.3 }}>
                    <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
                  </Box>
                  <Typography variant="h5" color="text.secondary" fontWeight="800">
                    Nenhum registro encontrado
                  </Typography>
                  <Typography variant="body1" color="text.disabled" sx={{ mt: 1 }}>
                    Tente ajustar os filtros para encontrar o que procura.
                  </Typography>
                </MotionPaper>
              ) : (
                <Box>
                  {historicoAtual.map((item, index) => (
                    <MotionCard 
                      key={item.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      elevation={0}
                      sx={{ 
                        ...glassStyles,
                        mb: 2.5, 
                        borderRadius: '24px',
                        overflow: 'hidden',
                        '&:hover': { 
                          boxShadow: '0 12px 40px rgba(0,0,0,0.08)', 
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main' 
                        },
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <CardContent sx={{ p: 3.5 }}>
                        <Grid container spacing={3} alignItems="center">
                          <Grid item xs={12} md={5}>
                            <Stack direction="row" spacing={2.5} alignItems="center">
                              <Avatar sx={{ 
                                bgcolor: alpha(theme.palette.primary.main, 0.1), 
                                color: 'primary.main',
                                width: 56,
                                height: 56,
                                fontWeight: 900,
                                border: '2px solid rgba(255, 255, 255, 0.8)',
                                fontSize: '1.25rem'
                              }}>
                                {item.usuario.nome.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="h6" fontWeight="900" color="text.primary" sx={{ lineHeight: 1.2 }}>
                                  {item.usuario.nome}
                                </Typography>
                                <Chip
                                  label={item.usuario.tipo}
                                  size="small"
                                  sx={{ 
                                    height: 22, 
                                    fontSize: '0.7rem', 
                                    fontWeight: 800,
                                    borderRadius: '6px',
                                    bgcolor: 'rgba(100, 116, 139, 0.1)',
                                    color: '#475569',
                                    mt: 0.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 0.6, bgcolor: 'rgba(241, 245, 249, 0.8)', borderRadius: '6px', display: 'flex' }}>
                                  <AssignmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                </Box>
                                <Typography variant="body2" color="text.primary" fontWeight="700">
                                  {formatarAcao(item.acao)}
                                </Typography>
                              </Box>
                              {item.descricao && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ p: 0.6, bgcolor: 'rgba(241, 245, 249, 0.8)', borderRadius: '6px', display: 'flex' }}>
                                    <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                                    {item.descricao}
                                  </Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 0.6, bgcolor: 'rgba(241, 245, 249, 0.8)', borderRadius: '6px', display: 'flex' }}>
                                  <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                </Box>
                                <Typography variant="caption" color="text.disabled" fontWeight="600">
                                  {formatarData(item.dataAcao)}
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>

                          <Grid item xs={12} md={3} sx={{ textAlign: { md: 'right' } }}>
                            <Box sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 1.5,
                              px: 2.5,
                              py: 1.5,
                              borderRadius: '16px',
                              bgcolor: alpha(getCorPontuacao(item.pontosGanhos), 0.08),
                              border: '1px solid',
                              borderColor: alpha(getCorPontuacao(item.pontosGanhos), 0.15)
                            }}>
                              {getIconePontuacao(item.pontosGanhos)}
                              <Typography 
                                variant="h5" 
                                fontWeight="900" 
                                sx={{ color: getCorPontuacao(item.pontosGanhos), letterSpacing: '-0.02em' }}
                              >
                                {item.pontosGanhos > 0 ? '+' : ''}{item.pontosGanhos} pts
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </MotionCard>
                  ))}

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={8}>
                      <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, newPage) => setPage(newPage)}
                        color="primary"
                        size="large"
                        sx={{
                          '& .MuiPaginationItem-root': {
                            borderRadius: '16px',
                            fontWeight: 800,
                            height: 48,
                            minWidth: 48,
                            fontSize: '1rem',
                            ...glassStyles,
                            '&.Mui-selected': {
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                              borderColor: 'transparent'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </AnimatePresence>
          </Box>
        </Container>
      </Box>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}

export default HistoricoPage;
