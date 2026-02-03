import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
  Tabs,
  Tab,
  Stack,
  alpha,
  Tooltip,
  CircularProgress,
  Avatar,
  Container,
  useTheme,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  PendingActions as PendingIcon,
  Warning as WarningIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Material {
  id: string;
  nome: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
}

interface ItemSolicitacao {
  id: string;
  materialId: string;
  material: Material;
  quantidade: number;
  quantidadeAprovada?: number;
  observacao?: string;
}

interface Solicitacao {
  id: string;
  dataCriacao: string;
  status: string;
  observacao?: string;
  dataAprovacao?: string;
  solicitante: { id: string; nome: string; email: string };
  aprovador?: { nome: string };
  motivoRejeicao?: string;
  itens: ItemSolicitacao[];
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  PENDENTE: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
  ENTREGUE: 'default'
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'APROVADA',  // Em maiúsculo para destacar
  REJEITADA: 'Rejeitada',
  ENTREGUE: 'Entregue'
};

export default function AprovarSolicitacoes() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabAtual, setTabAtual] = useState(0);
  const [busca, setBusca] = useState('');
  
  // Dialog de aprovação
  const [dialogAprovarAberto, setDialogAprovarAberto] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
  const [quantidadesAprovadas, setQuantidadesAprovadas] = useState<Record<string, number>>({});

  // Dialog de rejeição
  const [dialogRejeitarAberto, setDialogRejeitarAberto] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Dialog de exclusão
  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false);

  useEffect(() => {
    carregarSolicitacoes();
  }, [tabAtual]);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      const status = tabAtual === 0 ? 'PENDENTE' : undefined;
      const response = await api.get('/api/solicitacoes-material', {
        params: { status }
      });
      setSolicitacoes(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar solicitações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialogAprovar = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    const quantidades: Record<string, number> = {};
    solicitacao.itens.forEach(item => {
      quantidades[item.id] = item.quantidade;
    });
    setQuantidadesAprovadas(quantidades);
    setDialogAprovarAberto(true);
  };

  const handleAbrirDialogRejeitar = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setMotivoRejeicao('');
    setDialogRejeitarAberto(true);
  };

  const handleAbrirDialogExcluir = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setDialogExcluirAberto(true);
  };

  const handleAprovar = async () => {
    if (!solicitacaoSelecionada) return;
    try {
      setLoading(true);
      const itensAprovados = solicitacaoSelecionada.itens.map(item => ({
        itemId: item.id,
        quantidadeAprovada: quantidadesAprovadas[item.id]
      }));
      await api.post(`/api/solicitacoes-material/${solicitacaoSelecionada.id}/aprovar`, {
        itensAprovados
      });
      enqueueSnackbar('Solicitação aprovada com sucesso!', { variant: 'success' });
      setDialogAprovarAberto(false);
      setSolicitacaoSelecionada(null);
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao aprovar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async () => {
    if (!solicitacaoSelecionada) return;
    if (!motivoRejeicao.trim()) {
      enqueueSnackbar('Informe o motivo da rejeição', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      await api.post(`/api/solicitacoes-material/${solicitacaoSelecionada.id}/rejeitar`, {
        motivoRejeicao
      });
      enqueueSnackbar('Solicitação rejeitada', { variant: 'info' });
      setDialogRejeitarAberto(false);
      setSolicitacaoSelecionada(null);
      setMotivoRejeicao('');
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao rejeitar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!solicitacaoSelecionada) return;
    try {
      setLoading(true);
      await api.delete(`/api/solicitacoes-material/${solicitacaoSelecionada.id}`);
      enqueueSnackbar('Solicitação excluída com sucesso!', { variant: 'success' });
      setDialogExcluirAberto(false);
      setSolicitacaoSelecionada(null);
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao excluir solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const solicitacoesFiltradas = solicitacoes.filter(s => {
    const matchesStatus = tabAtual === 0 ? s.status === 'PENDENTE' : true;
    const matchesBusca = 
      s.solicitante.nome.toLowerCase().includes(busca.toLowerCase()) ||
      s.id.toLowerCase().includes(busca.toLowerCase()) ||
      s.itens.some(item => item.material.nome.toLowerCase().includes(busca.toLowerCase()));
    return matchesStatus && matchesBusca;
  });

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Materiais', href: '/materiais' },
          { label: 'Aprovar Solicitações' }
        ]}
      >
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 56, 
                  height: 56, 
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                }}>
                  <AssignmentIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    Aprovar Solicitações
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    Gerencie e autorize a saída de materiais do estoque
                  </Typography>
                </Box>
              </Stack>

              <Tooltip title="Atualizar lista">
                <IconButton 
                  onClick={carregarSolicitacoes} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: '#e2e8f0',
                    width: 48,
                    height: 48
                  }}
                >
                  <RefreshIcon className={loading ? 'spin-animation' : ''} />
                </IconButton>
              </Tooltip>
            </Stack>
          </MotionBox>

          <MotionPaper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: '24px',
              border: '1px solid',
              borderColor: alpha('#e2e8f0', 0.6),
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}>
              <TextField
                fullWidth
                placeholder="Pesquisar por solicitante, material ou ID da solicitação..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: '16px',
                    bgcolor: alpha('#f8fafc', 0.5),
                    '&:hover': { bgcolor: alpha('#f8fafc', 0.8) }
                  }
                }}
              />
            </Box>

            <Tabs 
              value={tabAtual} 
              onChange={(_, newValue) => setTabAtual(newValue)}
              sx={{
                px: 2,
                pt: 1,
                borderBottom: '1px solid',
                borderColor: alpha('#e2e8f0', 0.6),
                '& .MuiTab-root': {
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  minHeight: 56,
                  borderRadius: '12px 12px 0 0',
                }
              }}
            >
              <Tab icon={<PendingIcon sx={{ mr: 1 }} />} iconPosition="start" label="Pendentes" />
              <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} iconPosition="start" label="Histórico / Todas" />
            </Tabs>

            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {loading && solicitacoes.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <CircularProgress size={40} thickness={4} />
                  <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                    Buscando solicitações...
                  </Typography>
                </Box>
              ) : solicitacoesFiltradas.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <InfoIcon sx={{ fontSize: 64, color: alpha('#94a3b8', 0.2), mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" color="text.secondary">
                    Nenhuma solicitação encontrada
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    {tabAtual === 0 ? 'Não há solicitações aguardando sua aprovação.' : 'Nenhuma solicitação registrada no sistema.'}
                  </Typography>
                </Box>
              ) : (
                <AnimatePresence mode="popLayout">
                  {solicitacoesFiltradas.map((solicitacao, index) => (
                    <MotionPaper
                      key={solicitacao.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      elevation={0}
                      sx={{
                        p: { xs: 2, md: 3 },
                        mb: 3,
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: alpha('#e2e8f0', 0.6),
                        bgcolor: 'white',
                        '&:last-child': { mb: 0 },
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                            <AssignmentIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="800" color="#1e293b">
                              Solicitação #{solicitacao.id.slice(0, 8)}
                            </Typography>
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              {solicitacao.solicitante.nome} • {format(new Date(solicitacao.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label={statusLabels[solicitacao.status]}
                          color={statusColors[solicitacao.status]}
                          sx={{ fontWeight: 800, borderRadius: '10px', px: 1 }}
                        />
                      </Stack>

                      {solicitacao.observacao && (
                        <Box sx={{ mb: 3, p: 2, bgcolor: alpha('#f8fafc', 0.5), borderRadius: '12px', border: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}>
                          <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" gutterBottom>
                            OBSERVAÇÃO DO SOLICITANTE:
                          </Typography>
                          <Typography variant="body2" color="#334155">
                            {solicitacao.observacao}
                          </Typography>
                        </Box>
                      )}

                      <TableContainer sx={{ border: '1px solid', borderColor: alpha('#e2e8f0', 0.6), borderRadius: '16px', mb: 3 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Material</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Solicitado</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Estoque Atual</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Disponibilidade</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {solicitacao.itens.map((item) => {
                              const estoqueInsuficiente = item.material.quantidadeEstoque < item.quantidade;
                              return (
                                <TableRow key={item.id} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{item.material.nome}</TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      label={`${item.quantidade} ${item.material.unidadeMedida}`} 
                                      size="small" 
                                      sx={{ fontWeight: 700, borderRadius: '6px', bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700, color: estoqueInsuficiente ? 'error.main' : 'success.main' }}>
                                    {item.material.quantidadeEstoque} {item.material.unidadeMedida}
                                  </TableCell>
                                  <TableCell align="center">
                                    {estoqueInsuficiente ? (
                                      <Chip label="Insuficiente" color="error" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                    ) : (
                                      <Chip label="Disponível" color="success" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                        {user?.tipo === 'ADMIN' && (
                          <Tooltip title="Excluir Permanentemente">
                            <Button
                              variant="text"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleAbrirDialogExcluir(solicitacao)}
                              disabled={loading}
                              sx={{ fontWeight: 600 }}
                            >
                              Excluir
                            </Button>
                          </Tooltip>
                        )}

                        {solicitacao.status === 'PENDENTE' && (
                          <>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => handleAbrirDialogRejeitar(solicitacao)}
                              disabled={loading}
                              sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
                            >
                              Rejeitar
                            </Button>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => handleAbrirDialogAprovar(solicitacao)}
                              disabled={loading}
                              sx={{ 
                                borderRadius: '12px', 
                                fontWeight: 700, 
                                px: 4,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              Aprovar
                            </Button>
                          </>
                        )}
                      </Stack>

                      {solicitacao.status === 'APROVADA' && solicitacao.aprovador && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 3, p: 2, bgcolor: alpha('#10b981', 0.05), borderRadius: '12px' }}>
                          <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                          <Typography variant="body2" fontWeight="700" color="#059669">
                            Aprovado por {solicitacao.aprovador.nome} em {format(new Date(solicitacao.dataAprovacao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </Typography>
                        </Stack>
                      )}

                      {solicitacao.status === 'REJEITADA' && (
                        <Alert 
                          severity="error" 
                          icon={<CancelIcon />} 
                          variant="standard"
                          sx={{ 
                            mt: 3, 
                            borderRadius: '16px',
                            backdropFilter: 'blur(12px)',
                            backgroundColor: alpha(theme.palette.error.main, 0.15),
                            color: theme.palette.error.dark,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                            '& .MuiAlert-icon': {
                              color: theme.palette.error.main,
                            },
                            fontWeight: 600,
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="800">Motivo da rejeição:</Typography>
                          <Typography variant="body2">{solicitacao.motivoRejeicao}</Typography>
                        </Alert>
                      )}
                    </MotionPaper>
                  ))}
                </AnimatePresence>
              )}
            </Box>
          </MotionPaper>

        {/* Dialog de Aprovação */}
        <Dialog 
          open={dialogAprovarAberto} 
          onClose={() => setDialogAprovarAberto(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Confirmar Aprovação</DialogTitle>
          <DialogContent>
            {solicitacaoSelecionada && (
              <>
                <Alert 
                  severity="info" 
                  variant="standard"
                  sx={{ 
                    mb: 3, 
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    backgroundColor: alpha(theme.palette.info.main, 0.15),
                    color: theme.palette.info.dark,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                    '& .MuiAlert-icon': {
                      color: theme.palette.info.main,
                    },
                    fontWeight: 600,
                  }}
                >
                  Você pode ajustar as quantidades autorizadas. O estoque será atualizado automaticamente ao confirmar.
                </Alert>
                
                <TableContainer sx={{ border: '1px solid', borderColor: alpha('#e2e8f0', 0.6), borderRadius: '16px' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Material</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Solicitado</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Em Estoque</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Qtd. Aprovada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {solicitacaoSelecionada.itens.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.material.nome}</TableCell>
                          <TableCell align="center">
                            {item.quantidade} {item.material.unidadeMedida}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {item.material.quantidadeEstoque} {item.material.unidadeMedida}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={quantidadesAprovadas[item.id] || 0}
                              onChange={(e) => setQuantidadesAprovadas({
                                ...quantidadesAprovadas,
                                [item.id]: parseInt(e.target.value) || 0
                              })}
                              inputProps={{ 
                                min: 0,
                                max: Math.min(item.quantidade, item.material.quantidadeEstoque)
                              }}
                              sx={{ 
                                width: 100,
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDialogAprovarAberto(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAprovar} 
              variant="contained" 
              color="success" 
              disabled={loading}
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 700, 
                px: 3,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              Confirmar e Baixar Estoque
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Rejeição */}
        <Dialog 
          open={dialogRejeitarAberto} 
          onClose={() => setDialogRejeitarAberto(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Rejeitar Solicitação</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Por favor, informe o motivo pelo qual esta solicitação está sendo recusada.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Motivo da Rejeição"
              required
              autoFocus
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDialogRejeitarAberto(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRejeitar} 
              variant="contained" 
              color="error" 
              disabled={loading}
              sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
            >
              Confirmar Rejeição
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Exclusão */}
        <Dialog 
          open={dialogExcluirAberto} 
          onClose={() => setDialogExcluirAberto(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Alert 
              severity="warning" 
              icon={<WarningIcon />} 
              variant="standard"
              sx={{ 
                mb: 3, 
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.dark,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.warning.main,
                },
                fontWeight: 600,
              }}
            >
              <strong>Atenção:</strong> Esta ação é irreversível e apagará todos os registros desta solicitação.
            </Alert>
            <Typography variant="body1" fontWeight="500" gutterBottom>
              Deseja realmente excluir permanentemente a solicitação #{solicitacaoSelecionada?.id.slice(0, 8)}?
            </Typography>
            {solicitacaoSelecionada && (
              <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: '16px', border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.1) }}>
                <Typography variant="subtitle2" fontWeight="800" color="error.main">
                  Solicitante: {solicitacaoSelecionada.solicitante.nome}
                </Typography>
                <Typography variant="caption" fontWeight="600" color="error.main" display="block">
                  Data: {format(new Date(solicitacaoSelecionada.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDialogExcluirAberto(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExcluir} 
              variant="contained" 
              color="error" 
              disabled={loading}
              sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
            >
              {loading ? 'Excluindo...' : 'Sim, Excluir Agora'}
            </Button>
          </DialogActions>
        </Dialog>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-animation {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
}
