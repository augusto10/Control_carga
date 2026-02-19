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
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Stack,
  alpha,
  Tooltip,
  CircularProgress,
  useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  EmojiEvents as EmojiEventsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  History as HistoryIcon,
  WorkspacePremium as PremiumIcon,
  Stars as StarsIcon,
  MilitaryTech as MedalIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionTableRow = motion(TableRow);

const getMedalColor = (index: number) => {
  switch (index) {
    case 0: return '#fbbf24'; // Gold
    case 1: return '#94a3b8'; // Silver
    case 2: return '#b45309'; // Bronze
    default: return 'transparent';
  }
};

interface RankingUsuario {
  id: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
  posicaoRanking: number;
}

interface HistoricoPontuacao {
  id: string;
  usuario: {
    id: string;
    nome: string;
  };
  acao: string;
  pontosGanhos: number;
  descricao: string;
  dataAcao: string;
}

function GamificacaoPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingUsuario[]>([]);
  const [historico, setHistorico] = useState<HistoricoPontuacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registrarDialog, setRegistrarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [formData, setFormData] = useState({
    usuarioId: '',
    pedidoId: '',
    acao: 'PEDIDO_CORRETO',
    pontos: 10,
    descricao: ''
  });

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setRefreshing(true);
      const [rankingResponse, historicoResponse] = await Promise.all([
        api.get('/api/gamificacao/ranking'),
        api.get('/api/gamificacao/historico')
      ]);

      setRanking(rankingResponse.data.ranking);
      setHistorico(historicoResponse.data.historico);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSnackbar({ open: true, message: 'Erro ao carregar os dados de gamificação', severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegistrarPontuacao = async () => {
    try {
      const response = await api.post('/api/gamificacao/registrar-pontuacao', formData);
      if (response.data.success) {
        setSnackbar({ open: true, message: 'Pontuação registrada com sucesso!', severity: 'success' });
        setRegistrarDialog(false);
        carregarDados();
        setFormData({
          usuarioId: '',
          pedidoId: '',
          acao: 'PEDIDO_CORRETO',
          pontos: 10,
          descricao: ''
        });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao registrar pontuação', severity: 'error' });
    }
  };

  const getCorPontuacao = (pontos: number) => {
    return pontos > 0 ? 'success' : pontos < 0 ? 'error' : 'default';
  };

  const getIconeAcao = (acao: string) => {
    switch (acao) {
      case 'PEDIDO_CORRETO':
        return <TrendingUpIcon sx={{ color: '#10b981' }} />;
      case 'PEDIDO_INCORRETO':
        return <TrendingDownIcon sx={{ color: '#ef4444' }} />;
      default:
        return <HistoryIcon sx={{ color: '#6366f1' }} />;
    }
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
          <Stack spacing={3} alignItems="center">
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={64} thickness={4} sx={{ color: 'primary.main', opacity: 0.2 }} />
              <CircularProgress 
                size={64} 
                thickness={4} 
                sx={{ 
                  color: 'primary.main', 
                  position: 'absolute',
                  strokeLinecap: 'round'
                }} 
              />
              <PremiumIcon sx={{ position: 'absolute', fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom>
                Carregando Conquistas
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="500">
                Sincronizando ranking e atividades da equipe...
              </Typography>
            </Box>
          </Stack>
        </Box>
      
    );
  }

  return (
    
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        pt: { xs: 2, md: 4 },
        pb: { xs: 4, md: 6 }
      }}>
        <Container maxWidth="xl">
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ 
              mb: 4,
              p: 3,
              borderRadius: 4,
              ...glassStyles,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ 
                bgcolor: 'primary.main', 
                width: 56, 
                height: 56, 
                borderRadius: 3,
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PremiumIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                  Gamificação
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Reconhecimento e desempenho da equipe de carga
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Tooltip title="Atualizar dados">
                <IconButton 
                  onClick={carregarDados} 
                  disabled={refreshing}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.05), 
                    color: 'primary.main',
                    borderRadius: '12px',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                  }}
                >
                  <RefreshIcon className={refreshing ? 'spin-animation' : ''} />
                </IconButton>
              </Tooltip>
              {(user?.tipo === 'ADMIN' || user?.tipo === 'GERENTE') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setRegistrarDialog(true)}
                  sx={{ 
                    borderRadius: '12px', 
                    px: 3,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    '&:hover': { boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)' }
                  }}
                >
                  Registrar Pontuação
                </Button>
              )}
            </Stack>
          </MotionBox>

          <Grid container spacing={4}>
            {/* Ranking Principal */}
            <Grid item xs={12} lg={8}>
              <MotionPaper 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                elevation={0} 
                sx={{ 
                  p: { xs: 2, md: 3 },
                  borderRadius: '24px',
                  ...glassStyles,
                  overflow: 'hidden'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2, 
                    bgcolor: alpha('#fbbf24', 0.1), 
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <EmojiEventsIcon />
                  </Box>
                  <Typography variant="h5" fontWeight="800" color="text.primary">
                    Ranking Geral
                  </Typography>
                </Stack>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Posição</TableCell>
                        <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Usuário</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Pontuação</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Acertos</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Falhas</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Taxa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {ranking.map((usuario, index) => {
                          const taxaAcerto = usuario.pedidosCorretos + usuario.pedidosIncorretos > 0
                            ? Math.round((usuario.pedidosCorretos / (usuario.pedidosCorretos + usuario.pedidosIncorretos)) * 100)
                            : 0;
                          
                          return (
                            <MotionTableRow 
                              key={usuario.id} 
                              hover
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              sx={{ 
                                '&:hover': { bgcolor: alpha('#f1f5f9', 0.5) },
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {index < 3 ? (
                                    <Tooltip title={`${index + 1}º Lugar`}>
                                      <MedalIcon sx={{ color: getMedalColor(index), fontSize: 28 }} />
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="body2" fontWeight="700" color="text.disabled" sx={{ width: 28, textAlign: 'center' }}>
                                      {index + 1}º
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar sx={{ 
                                    bgcolor: index < 3 ? getMedalColor(index) : 'primary.main',
                                    width: 40,
                                    height: 40,
                                    fontWeight: 700,
                                    boxShadow: index < 3 ? `0 4px 12px ${alpha(getMedalColor(index), 0.3)}` : 'none'
                                  }}>
                                    {(usuario.usuario?.nome?.charAt(0)?.toUpperCase() ?? '?')}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" fontWeight="700" color="#1e293b">
                                      {usuario.usuario?.nome ?? '-'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {usuario.usuario?.tipo || 'Colaborador'}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${usuario.pontuacaoTotal} pts`}
                                  sx={{ 
                                    fontWeight: 800, 
                                    bgcolor: alpha('#3b82f6', 0.1), 
                                    color: '#2563eb',
                                    borderRadius: '8px'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="700" color="#10b981">
                                  {usuario.pedidosCorretos}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="700" color="#ef4444">
                                  {usuario.pedidosIncorretos}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                  <CircularProgress 
                                    variant="determinate" 
                                    value={taxaAcerto} 
                                    size={40} 
                                    thickness={4}
                                    sx={{ color: taxaAcerto > 80 ? '#10b981' : taxaAcerto > 50 ? '#f59e0b' : '#ef4444' }}
                                  />
                                  <Box
                                    sx={{
                                      top: 0,
                                      left: 0,
                                      bottom: 0,
                                      right: 0,
                                      position: 'absolute',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight="800" fontSize="0.65rem">
                                      {taxaAcerto}%
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                            </MotionTableRow>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </TableContainer>
              </MotionPaper>
            </Grid>

            {/* Histórico de Atividades */}
            <Grid item xs={12} lg={4}>
              <MotionPaper 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                elevation={0} 
                sx={{ 
                  p: { xs: 2, md: 3 },
                  borderRadius: '24px',
                  ...glassStyles,
                  height: '100%',
                  overflow: 'hidden'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2, 
                    bgcolor: alpha('#6366f1', 0.1), 
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <HistoryIcon />
                  </Box>
                  <Typography variant="h5" fontWeight="800" color="text.primary">
                    Atividades
                  </Typography>
                </Stack>

                <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 2 } }}>
                  <AnimatePresence mode="popLayout">
                    {historico.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
                        <HistoryIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">Nenhuma atividade recente</Typography>
                      </Box>
                    ) : (
                      historico.map((item, index) => (
                        <MotionCard 
                          key={item.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          sx={{ 
                            mb: 2, 
                            borderRadius: '16px',
                            ...glassStyles,
                            bgcolor: alpha('#fff', 0.5),
                            boxShadow: 'none',
                            '&:hover': { 
                              bgcolor: alpha('#fff', 0.8),
                              transform: 'translateX(4px)',
                              boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {getIconeAcao(item.acao)}
                                  <Typography variant="subtitle2" fontWeight="800" color="text.primary">
                                    {item.usuario.nome.split(' ')[0]}
                                  </Typography>
                                </Stack>
                                <Chip
                                  label={`${item.pontosGanhos > 0 ? '+' : ''}${item.pontosGanhos} pts`}
                                  size="small"
                                  sx={{ 
                                    fontWeight: 800,
                                    bgcolor: alpha(item.pontosGanhos > 0 ? '#10b981' : '#ef4444', 0.1),
                                    color: item.pontosGanhos > 0 ? '#059669' : '#dc2626',
                                    borderRadius: '6px',
                                    height: 20,
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                                {item.descricao}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                <TodayIcon sx={{ fontSize: 12 }} />
                                {new Date(item.dataAcao).toLocaleDateString()} às {new Date(item.dataAcao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </MotionCard>
                      ))
                    )}
                  </AnimatePresence>
                </Box>
              </MotionPaper>
            </Grid>
          </Grid>

          {/* Dialog de Registro */}
          <AnimatePresence>
            {registrarDialog && (
              <Dialog 
                open={registrarDialog} 
                onClose={() => setRegistrarDialog(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                  sx: {
                    borderRadius: '24px',
                    p: 1,
                    background: alpha('#ffffff', 0.9),
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: `1px solid ${alpha('#ffffff', 0.5)}`
                  }
                }}
              >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#1e293b', pb: 1, pt: 3, px: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1), 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <StarsIcon fontSize="large" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="800">Registrar Pontuação</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Gestão de Desempenho
                      </Typography>
                    </Box>
                  </Stack>
                </DialogTitle>
                <DialogContent sx={{ px: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
                    Adicione ou remova pontos de um colaborador com base em seu desempenho operacional.
                  </Typography>
                  
                  <Stack spacing={2.5}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ fontWeight: 600 }}>Tipo de Ação</InputLabel>
                      <Select
                        value={formData.acao}
                        label="Tipo de Ação"
                        onChange={(e) => setFormData({ ...formData, acao: e.target.value })}
                        sx={{ 
                          borderRadius: '12px',
                          bgcolor: alpha('#fff', 0.5),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#000', 0.1) }
                        }}
                      >
                        <MenuItem value="PEDIDO_CORRETO">Pedido Correto (+)</MenuItem>
                        <MenuItem value="PEDIDO_INCORRETO">Pedido Incorreto (-)</MenuItem>
                        <MenuItem value="OUTRO">Outra Ação</MenuItem>
                      </Select>
                    </FormControl>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="ID do Pedido"
                          placeholder="Ex: 12345"
                          value={formData.pedidoId}
                          onChange={(e) => setFormData({ ...formData, pedidoId: e.target.value })}
                          InputProps={{ 
                            sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } 
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Pontos"
                          type="number"
                          value={formData.pontos}
                          onChange={(e) => setFormData({ ...formData, pontos: parseInt(e.target.value) || 0 })}
                          InputProps={{ 
                            sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } 
                          }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      fullWidth
                      label="ID do Usuário"
                      placeholder="Identificação do colaborador"
                      value={formData.usuarioId}
                      onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                      InputProps={{ 
                        sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } 
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Descrição da Atividade"
                      multiline
                      rows={3}
                      placeholder="Descreva detalhadamente o motivo desta pontuação..."
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      InputProps={{ 
                        sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } 
                      }}
                    />
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 4, pt: 2, gap: 1.5 }}>
                  <Button 
                    onClick={() => setRegistrarDialog(false)}
                    color="inherit"
                    sx={{ 
                      borderRadius: '12px', 
                      fontWeight: 700, 
                      px: 3,
                      textTransform: 'none',
                      color: 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.05) }
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleRegistrarPontuacao} 
                    variant="contained"
                    sx={{ 
                      borderRadius: '12px', 
                      fontWeight: 800, 
                      px: 4,
                      textTransform: 'none',
                      boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      '&:hover': { 
                        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s'
                    }}
                  >
                    Confirmar Registro
                  </Button>
                </DialogActions>
              </Dialog>
            )}
          </AnimatePresence>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity} 
              variant="standard"
              sx={{ 
                width: '100%', 
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                backgroundColor: alpha(theme.palette[snackbar.severity].main, 0.15),
                color: theme.palette[snackbar.severity].dark,
                border: `1px solid ${alpha(theme.palette[snackbar.severity].main, 0.3)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette[snackbar.severity].main,
                },
                boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                fontWeight: 600,
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>

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
    
  );
}

export default GamificacaoPage;
