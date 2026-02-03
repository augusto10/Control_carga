import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  alpha,
  Tooltip,
  IconButton,
  useTheme
} from '@mui/material';
import { 
  EmojiEvents, 
  TrendingUp, 
  Assessment, 
  Refresh as RefreshIcon,
  Star as StarIcon,
  MilitaryTech as MedalIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

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

interface RankingItem {
  id: string;
  usuarioId: string;
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
  posicaoRanking: number;
  usuario: Usuario;
}

function RankingPage() {
  const theme = useTheme();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarRanking();
  }, []);

  const carregarRanking = async () => {
    try {
      if (!loading) setRefreshing(true);
      else setLoading(true);
      
      const response = await api.get('/api/gamificacao/ranking');
      setRanking(response.data.ranking || []);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      setError('Erro ao carregar ranking. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCorPosicao = (posicao: number) => {
    if (posicao === 1) return '#fbbf24'; // Ouro (mais vibrante)
    if (posicao === 2) return '#94a3b8'; // Prata
    if (posicao === 3) return '#b45309'; // Bronze
    return '#e2e8f0'; // Padrão
  };

  const getPosicaoIcon = (posicao: number) => {
    if (posicao === 1) return <StarIcon sx={{ color: '#fbbf24', fontSize: 24 }} />;
    if (posicao === 2) return <MedalIcon sx={{ color: '#94a3b8', fontSize: 24 }} />;
    if (posicao === 3) return <MedalIcon sx={{ color: '#b45309', fontSize: 24 }} />;
    return null;
  };

  const calcularTaxaAcerto = (corretos: number, incorretos: number) => {
    const total = corretos + incorretos;
    if (total === 0) return 0;
    return Math.round((corretos / total) * 100);
  };

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
            Carregando ranking...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <ProtectedRoute>
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
                  <EmojiEvents sx={{ fontSize: 36 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, letterSpacing: '-0.02em' }}>
                    Ranking da Equipe
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight="500">
                    Acompanhe o desempenho e a produtividade em tempo real
                  </Typography>
                </Box>
              </Stack>

              <Tooltip title="Atualizar dados">
                <IconButton 
                  onClick={carregarRanking} 
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

          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            elevation={0}
            sx={{ 
              ...glassStyles,
              p: 0, 
              overflow: 'hidden',
              borderRadius: '32px',
            }}
          >
            <Box sx={{ p: 4, borderBottom: '1px solid', borderColor: 'rgba(226, 232, 240, 0.6)', bgcolor: 'rgba(248, 250, 252, 0.4)' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: '10px', display: 'flex' }}>
                  <Assessment sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ letterSpacing: '0.01em' }}>
                  TABELA DE CLASSIFICAÇÃO
                </Typography>
              </Stack>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(248, 250, 252, 0.6)' }}>
                    <TableCell sx={{ fontWeight: 800, py: 2.5, pl: 4, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Posição</TableCell>
                    <TableCell sx={{ fontWeight: 800, py: 2.5, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Colaborador</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, py: 2.5, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pontuação</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, py: 2.5, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acertos</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, py: 2.5, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Erros</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, py: 2.5, pr: 4, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Eficiência</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {ranking.map((item, index) => (
                      <MotionTableRow 
                        key={item.id} 
                        hover
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        sx={{ 
                          '&:hover': { bgcolor: 'rgba(241, 245, 249, 0.7)' },
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell sx={{ pl: 4 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              sx={{
                                bgcolor: getCorPosicao(item.posicaoRanking || 0),
                                color: item.posicaoRanking <= 3 ? 'white' : 'text.primary',
                                width: 42,
                                height: 42,
                                fontSize: '1rem',
                                fontWeight: 900,
                                boxShadow: item.posicaoRanking <= 3 ? `0 6px 16px ${alpha(getCorPosicao(item.posicaoRanking), 0.35)}` : 'none',
                                border: item.posicaoRanking > 3 ? '2px solid rgba(226, 232, 240, 0.8)' : '2px solid rgba(255, 255, 255, 0.5)',
                              }}
                            >
                              {item.posicaoRanking}
                            </Avatar>
                            {getPosicaoIcon(item.posicaoRanking)}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                              width: 40, 
                              height: 40, 
                              fontSize: '1rem', 
                              bgcolor: alpha(theme.palette.primary.main, 0.1), 
                              color: 'primary.main',
                              fontWeight: 800,
                              border: '1px solid',
                              borderColor: alpha(theme.palette.primary.main, 0.2)
                            }}>
                              {item.usuario.nome.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="800" color="text.primary" sx={{ lineHeight: 1.2 }}>
                                {item.usuario.nome}
                              </Typography>
                              <Typography variant="caption" fontWeight="600" sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {item.usuario.tipo}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.pontuacaoTotal} pts`}
                            sx={{ 
                              fontWeight: 900,
                              borderRadius: '10px',
                              bgcolor: item.pontuacaoTotal > 0 ? alpha('#10b981', 0.12) : item.pontuacaoTotal < 0 ? alpha('#ef4444', 0.12) : alpha('#94a3b8', 0.12),
                              color: item.pontuacaoTotal > 0 ? '#059669' : item.pontuacaoTotal < 0 ? '#dc2626' : '#64748b',
                              border: '1px solid',
                              borderColor: 'transparent',
                              minWidth: 100,
                              height: 32,
                              fontSize: '0.875rem'
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />
                            <Typography variant="body1" color="#059669" fontWeight="800">
                              {item.pedidosCorretos}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" color="#dc2626" fontWeight="800">
                            {item.pedidosIncorretos}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ pr: 4 }}>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <Chip
                              label={`${calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos)}%`}
                              size="small"
                              sx={{ 
                                fontWeight: 800,
                                borderRadius: '8px',
                                px: 1,
                                bgcolor: (taxa) => {
                                  const val = calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos);
                                  if (val >= 90) return alpha('#10b981', 0.15);
                                  if (val >= 70) return alpha('#f59e0b', 0.15);
                                  return alpha('#ef4444', 0.15);
                                },
                                color: (taxa) => {
                                  const val = calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos);
                                  if (val >= 90) return '#059669';
                                  if (val >= 70) return '#d97706';
                                  return '#dc2626';
                                },
                                height: 28
                              }}
                            />
                          </Box>
                        </TableCell>
                      </MotionTableRow>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>

            {ranking.length === 0 && !loading && (
              <Box textAlign="center" py={12}>
                <Stack spacing={2} alignItems="center">
                  <Box sx={{ p: 3, bgcolor: 'rgba(241, 245, 249, 0.5)', borderRadius: '50%' }}>
                    <EmojiEvents sx={{ fontSize: 80, color: 'rgba(148, 163, 184, 0.3)' }} />
                  </Box>
                  <Typography variant="h5" fontWeight="800" color="text.secondary">
                    Sem dados de ranking
                  </Typography>
                  <Typography variant="body1" color="text.disabled" sx={{ maxWidth: 300 }}>
                    As pontuações e classificações serão exibidas assim que os registros começarem.
                  </Typography>
                </Stack>
              </Box>
            )}
          </MotionPaper>

          <style jsx global>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spin-animation {
              animation: spin 1s linear infinite;
            }
          `}</style>
        </Container>
      </Box>
    </ProtectedRoute>
  );
}

export default RankingPage;
