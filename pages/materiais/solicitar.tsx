import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
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
  Autocomplete,
  Stack,
  alpha,
  Tooltip,
  CircularProgress,
  Avatar,
  Container,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  ShoppingCart as ShoppingCartIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Inventory as InventoryIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import ResponsiveContainer from '@/components/ResponsiveContainer';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

interface Material {
  id: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  ativo: boolean;
}

interface ItemSolicitacao {
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  quantidade: number;
  observacao: string;
}

interface Solicitacao {
  id: string;
  dataCriacao: string;
  status: string;
  observacao?: string;
  dataAprovacao?: string;
  aprovador?: { nome: string };
  motivoRejeicao?: string;
  itens: Array<{
    material: Material;
    quantidade: number;
    quantidadeAprovada?: number;
  }>;
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  PENDENTE: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
  ENTREGUE: 'default'
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ENTREGUE: 'Entregue'
};

export default function SolicitarMaterial() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<ItemSolicitacao[]>([]);
  const [observacao, setObservacao] = useState('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Novo item
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacaoItem, setObservacaoItem] = useState('');

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  useEffect(() => {
    carregarMateriais();
    carregarMinhasSolicitacoes();
  }, []);

  const carregarMateriais = async () => {
    try {
      const response = await api.get('/api/materiais', {
        params: { ativo: true }
      });
      setMateriais(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar materiais', { variant: 'error' });
    }
  };

  const carregarMinhasSolicitacoes = async () => {
    try {
      const response = await api.get('/api/solicitacoes-material', {
        params: { minhas: true }
      });
      setSolicitacoes(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar solicitações', { variant: 'error' });
    }
  };

  const handleAdicionarItem = () => {
    if (!materialSelecionado) {
      enqueueSnackbar('Selecione um material', { variant: 'warning' });
      return;
    }

    if (quantidade <= 0) {
      enqueueSnackbar('Quantidade deve ser maior que zero', { variant: 'warning' });
      return;
    }

    // Verificar se já existe
    if (itens.some(item => item.materialId === materialSelecionado.id)) {
      enqueueSnackbar('Material já adicionado', { variant: 'warning' });
      return;
    }

    setItens([
      ...itens,
      {
        materialId: materialSelecionado.id,
        materialNome: materialSelecionado.nome,
        unidadeMedida: materialSelecionado.unidadeMedida,
        quantidade,
        observacao: observacaoItem
      }
    ]);

    // Limpar campos
    setMaterialSelecionado(null);
    setQuantidade(1);
    setObservacaoItem('');
  };

  const handleRemoverItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleEnviarSolicitacao = async () => {
    if (itens.length === 0) {
      enqueueSnackbar('Adicione pelo menos um item', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/solicitacoes-material', {
        observacao,
        itens: itens.map(item => ({
          materialId: item.materialId,
          quantidade: item.quantidade,
          observacao: item.observacao || null
        }))
      });

      enqueueSnackbar('Solicitação enviada com sucesso!', { variant: 'success' });
      
      // Limpar formulário
      setItens([]);
      setObservacao('');
      
      // Recarregar solicitações
      carregarMinhasSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao enviar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Materiais', path: '/materiais' },
          { label: 'Solicitar' }
        ]}
      >
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 4,
            gap: 2,
            p: 3,
            borderRadius: 4,
            ...glassStyles
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              bgcolor: 'primary.main', 
              p: 1.5, 
              borderRadius: 3, 
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            }}>
              <ShoppingCartIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                Solicitar Materiais
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="500">
                Solicite itens do estoque para suas atividades
              </Typography>
            </Box>
          </Box>
          <Button
            variant={mostrarHistorico ? 'contained' : 'outlined'}
            startIcon={mostrarHistorico ? <AddIcon /> : <HistoryIcon />}
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            sx={{ 
              borderRadius: '12px', 
              px: 3, 
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: mostrarHistorico ? '0 8px 20px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            {mostrarHistorico ? 'Nova Solicitação' : 'Minhas Solicitações'}
          </Button>
        </MotionBox>

        <AnimatePresence mode="wait">
          {!mostrarHistorico ? (
            <MotionBox
              key="nova-solicitacao"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Formulário de Nova Solicitação */}
              <MotionPaper
                elevation={0}
                sx={{
                  p: 4,
                  mb: 4,
                  borderRadius: 4,
                  ...glassStyles,
                  overflow: 'visible'
                }}
              >
                <Typography variant="h6" fontWeight="700" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <AddIcon /> Adicionar Itens
                </Typography>
                
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Autocomplete
                      options={materiais}
                      getOptionLabel={(option) => `${option.nome} (${option.quantidadeEstoque} ${option.unidadeMedida})`}
                      value={materialSelecionado}
                      onChange={(_, newValue) => setMaterialSelecionado(newValue)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Material" 
                          fullWidth 
                          InputProps={{
                            ...params.InputProps,
                            sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      value={quantidade}
                      onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                      InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      label="Observação (opcional)"
                      value={observacaoItem}
                      onChange={(e) => setObservacaoItem(e.target.value)}
                      InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdicionarItem}
                        disabled={loading || !materialSelecionado}
                        sx={{ 
                          borderRadius: '12px', 
                          px: 4, 
                          py: 1.2,
                          fontWeight: 700,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)'
                        }}
                      >
                        Adicionar à Lista
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </MotionPaper>

              {/* Lista de Itens */}
              {itens.length > 0 && (
                <MotionPaper
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    ...glassStyles,
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="h6" fontWeight="700" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <ShoppingCartIcon /> Itens da Solicitação
                  </Typography>

                  <TableContainer sx={{ mb: 4, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Material</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Quantidade</TableCell>
                          <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Observação</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itens.map((item, index) => (
                          <TableRow key={index} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontWeight: 600 }}>{item.materialNome}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${item.quantidade} ${item.unidadeMedida}`} 
                                size="small"
                                sx={{ fontWeight: 700, borderRadius: '8px', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontStyle: item.observacao ? 'normal' : 'italic' }}>
                              {item.observacao || 'Sem observação'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Remover item">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoverItem(index)}
                                  sx={{ 
                                    bgcolor: alpha(theme.palette.error.main, 0.05),
                                    borderRadius: '10px',
                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack spacing={4}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Observação Geral (opcional)"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Adicione informações adicionais sobre esta solicitação..."
                      InputProps={{ sx: { borderRadius: '16px', bgcolor: alpha('#fff', 0.5) } }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        onClick={handleEnviarSolicitacao}
                        disabled={loading}
                        sx={{ 
                          borderRadius: '16px', 
                          px: 6, 
                          py: 1.8,
                          fontWeight: 800,
                          textTransform: 'none',
                          fontSize: '1rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                          '&:hover': {
                            boxShadow: '0 12px 24px rgba(16, 185, 129, 0.4)',
                          }
                        }}
                      >
                        {loading ? 'Enviando...' : 'Finalizar Solicitação'}
                      </Button>
                    </Box>
                  </Stack>
                </MotionPaper>
              )}

              {itens.length === 0 && (
                <MotionBox 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  sx={{ textAlign: 'center', py: 10, opacity: 0.6 }}
                >
                  <InventoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.2 }} />
                  <Typography variant="h6" color="text.secondary" fontWeight="600">
                    Sua lista de solicitação está vazia
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Adicione materiais acima para começar uma nova solicitação.
                  </Typography>
                </MotionBox>
              )}
            </MotionBox>
          ) : (
            /* Histórico de Solicitações */
            <MotionBox
              key="historico-solicitacoes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {solicitacoes.length === 0 ? (
                <MotionPaper
                  sx={{ p: 10, textAlign: 'center', borderRadius: 4, ...glassStyles }}
                >
                  <HistoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.2 }} />
                  <Typography variant="h6" fontWeight="600" color="text.secondary">
                    Nenhuma solicitação encontrada
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Suas solicitações aparecerão aqui assim que você criá-las.
                  </Typography>
                </MotionPaper>
              ) : (
                <Stack spacing={3}>
                  {solicitacoes.map((solicitacao, index) => (
                    <MotionPaper
                      key={solicitacao.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        ...glassStyles,
                        overflow: 'hidden'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.1), 
                            color: 'primary.main',
                            width: 48,
                            height: 48
                          }}>
                            <DescriptionIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="800" color="text.primary" lineHeight={1.2}>
                              Solicitação #{solicitacao.id.slice(0, 8)}
                            </Typography>
                            <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <TodayIcon sx={{ fontSize: 14 }} />
                              {format(new Date(solicitacao.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label={statusLabels[solicitacao.status]}
                          color={statusColors[solicitacao.status]}
                          icon={solicitacao.status === 'APROVADA' ? <CheckCircleIcon /> : solicitacao.status === 'REJEITADA' ? <CancelIcon /> : <InfoIcon />}
                          sx={{ fontWeight: '800', borderRadius: '8px', px: 1 }}
                        />
                      </Stack>
                      
                      <Box sx={{ bgcolor: alpha(theme.palette.background.default, 0.4), p: 2.5, borderRadius: 3, mb: 2, border: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                        <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5, display: 'block' }}>ITENS SOLICITADOS</Typography>
                        <Stack spacing={1.5}>
                          {solicitacao.itens.map((item, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight="700" color="text.primary">{item.material.nome}</Typography>
                              <Chip 
                                label={`${item.quantidade} ${item.material.unidadeMedida}`} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontWeight: 800, borderRadius: '6px', height: 22, fontSize: '0.75rem', bgcolor: alpha(theme.palette.primary.main, 0.05), border: 'none' }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      </Box>

                      {solicitacao.observacao && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" fontWeight="700" color="text.secondary">OBSERVAÇÃO</Typography>
                          <Typography variant="body2" color="text.primary">{solicitacao.observacao}</Typography>
                        </Box>
                      )}

                      {solicitacao.status === 'REJEITADA' && solicitacao.motivoRejeicao && (
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
                            mt: 2,
                          }}
                        >
                          <Typography variant="caption" fontWeight="800" sx={{ display: 'block', mb: 0.5, color: 'error.main' }}>MOTIVO DA REJEIÇÃO:</Typography>
                          <Typography variant="body2" fontWeight="500">{solicitacao.motivoRejeicao}</Typography>
                        </Alert>
                      )}

                      {solicitacao.status === 'APROVADA' && solicitacao.aprovador && (
                        <Alert 
                          severity="success" 
                          variant="standard"
                          sx={{ 
                            borderRadius: '16px',
                            backdropFilter: 'blur(12px)',
                            backgroundColor: alpha(theme.palette.success.main, 0.15),
                            color: theme.palette.success.dark,
                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                            '& .MuiAlert-icon': {
                              color: theme.palette.success.main,
                            },
                            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                            fontWeight: 600,
                            mt: 2,
                          }}
                        >
                          <Typography variant="body2" fontWeight="600">
                            Aprovada por {solicitacao.aprovador.nome} em {solicitacao.dataAprovacao && format(new Date(solicitacao.dataAprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </Typography>
                        </Alert>
                      )}
                    </MotionPaper>
                  ))}
                </Stack>
              )}
            </MotionBox>
          )}
        </AnimatePresence>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
}
