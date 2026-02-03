// ===== RELATÓRIO DE SEPARAÇÃO - DOMÍNIO DE PEDIDOS =====
//
// IMPORTANTE: Esta página mostra relatório de PEDIDOS (separação/conferência)
// NÃO confundir com NOTAS FISCAIS - são processos logísticos completamente distintos
//
// DOMÍNIO DE PEDIDOS - EXPLICAÇÃO DETALHADA:
//
// Este arquivo trabalha com o domínio de PEDIDOS, que é um processo interno de separação
// e conferência de itens no estoque/armazém. É diferente do controle de notas fiscais:
//
// PEDIDOS (Este sistema):
// - Solicitações internas para separação de produtos
// - Processo de picking/separação no armazém
// - Conferência e auditoria dos itens separados
// - Controle de separadores, conferentes e auditores
// - Fluxo: Criação → Separação → Conferência → Auditoria → Finalização
// - Dados salvos na tabela PedidoConferido
//
// NOTAS FISCAIS (Sistema diferente):
// - Documentos fiscais obrigatórios para transporte
// - Controle de carga para motoristas externos
// - Assinaturas digitais de motoristas e responsáveis
// - Dados salvos nas tabelas NotaFiscal e ControleManifesto
//
// ATENÇÃO: Não misturar os dois domínios - são tabelas, APIs e fluxos diferentes!

import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Grid,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Avatar,
  InputAdornment
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  LocalShipping as LocalShippingIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Verified as VerifiedIcon,
  PendingActions as PendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { validarPedido } from '@/services/gamificacaoService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

const glassStyles = {
  background: alpha('#ffffff', 0.7),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha('#ffffff', 0.3)}`,
  boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
};

const MOTIVOS_INCONSISTENCIA = [
  'AVARIA',
  'QUANTIDADE',
  'PRODUTO TROCADO',
  'EMBALAGEM',
  'PRODUTO SUJO',
  'PRODUTO VENCIDO',
  'ETIQUETAGEM',
  'LOTE',
  'SEM INCONSISTÊNCIA',
  'PRODUTO FALTANDO'
] as const;

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface PedidoConferido {
  id: string;
  dataCriacao: string;
  pedido100: boolean;
  inconsistencia: boolean;
  motivosInconsistencia: string[];
  observacoes: string | null;
  conferente: Usuario;
  statusValidacao: 'PENDENTE' | 'VALIDADO_CORRETO' | 'VALIDADO_INCORRETO';
}

interface Pedido {
  id: string;
  numeroPedido: string;
  dataCriacao: string;
  controle: {
    id: string;
    numeroManifesto: string | null;
    motorista: string;
    responsavel: string;
    transportadora: string;
    separador: Usuario | null;
    auditor: Usuario | null;
  } | null;
  conferido: PedidoConferido | null;
}

interface Filtros {
  dataInicio: Date | null;
  dataFim: Date | null;
  status: 'todos' | 'com-inconsistencia' | 'sem-inconsistencia';
}

function PaginaConferenciaPedidos() {
  const theme = useTheme();
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [pedido100, setPedido100] = useState('sim');
  const [inconsistencia, setInconsistencia] = useState('nao');
  const [motivos, setMotivos] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [validando, setValidando] = useState<Record<string, boolean>>({});
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: null,
    dataFim: null,
    status: 'todos'
  });
  const [busca, setBusca] = useState('');

  const carregarPedidos = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const params = new URLSearchParams();
      
      if (filtros.dataInicio) {
        params.append('dataInicio', filtros.dataInicio.toISOString());
      }
      
      if (filtros.dataFim) {
        params.append('dataFim', filtros.dataFim.toISOString());
      }
      
      if (filtros.status !== 'todos') {
        params.append('status', filtros.status);
      }
      
      const response = await api.get(`/api/pedidos?${params.toString()}`);
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setErro('Erro ao carregar a lista de pedidos. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, [filtros]);

  const handleAbrirModal = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
    
    if (pedido.conferido) {
      setPedido100(pedido.conferido.pedido100 ? 'sim' : 'nao');
      setInconsistencia(pedido.conferido.inconsistencia ? 'sim' : 'nao');
      setMotivos(pedido.conferido.motivosInconsistencia);
      setObservacoes(pedido.conferido.observacoes || '');
    } else {
      setPedido100('sim');
      setInconsistencia('nao');
      setMotivos([]);
      setObservacoes('');
    }
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setPedidoSelecionado(null);
  };

  const handleMotivoChange = (event: SelectChangeEvent<typeof motivos>) => {
    const { value } = event.target;
    setMotivos(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSalvarConferencia = async () => {
    if (!pedidoSelecionado || !user) return;
    
    try {
      await api.post('/api/conferencias', {
        pedidoId: pedidoSelecionado.id,
        pedido100,
        inconsistencia,
        motivosInconsistencia: inconsistencia === 'sim' ? motivos : [],
        observacoes: observacoes || undefined
      });
      
      setSucesso('Conferência registrada com sucesso!');
      await carregarPedidos();
      handleFecharModal();
    } catch (error) {
      console.error('Erro ao salvar conferência:', error);
      setErro('Erro ao salvar a conferência. Tente novamente.');
    }
  };

  const handleValidarPedido = async (pedidoConferidoId: string, status: 'VALIDADO_CORRETO' | 'VALIDADO_INCORRETO') => {
    setValidando(prev => ({ ...prev, [pedidoConferidoId]: true }));
    try {
      const response = await validarPedido(pedidoConferidoId, status);
      setSucesso(response.message);
      setPedidos(pedidos.map(p => {
        if (p.conferido?.id === pedidoConferidoId) {
          return { ...p, conferido: { ...p.conferido, statusValidacao: status } };
        }
        return p;
      }));
    } catch (error: any) {
      setErro(error.message || 'Erro ao validar pedido.');
    } finally {
      setValidando(prev => ({ ...prev, [pedidoConferidoId]: false }));
    }
  };

  const handleMudarPagina = (event: unknown, novaPagina: number) => {
    setPagina(novaPagina);
  };

  const handleMudarLinhasPorPagina = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinhasPorPagina(parseInt(event.target.value, 10));
    setPagina(0);
  };
  
  const handleFecharNotificacao = () => {
    setErro(null);
    setSucesso(null);
  };
  
  const pedidosFiltrados = pedidos.filter(p => {
    const termo = busca.toLowerCase();
    return (
      p.numeroPedido.toLowerCase().includes(termo) ||
      (p.controle?.separador?.nome || '').toLowerCase().includes(termo) ||
      (p.conferido?.conferente?.nome || '').toLowerCase().includes(termo)
    );
  });

  const pedidosPaginados = pedidosFiltrados.slice(
    pagina * linhasPorPagina,
    (pagina + 1) * linhasPorPagina
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      py: { xs: 2, md: 4 }
    }}>
      <Container maxWidth="xl">
        {/* Notificações */}
        <Snackbar 
          open={!!erro} 
          autoHideDuration={6000} 
          onClose={handleFecharNotificacao} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleFecharNotificacao} 
            severity="error" 
            variant="standard"
            sx={{ 
              width: '100%', 
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
            {erro}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!sucesso} 
          autoHideDuration={6000} 
          onClose={handleFecharNotificacao} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleFecharNotificacao} 
            severity="success" 
            variant="standard"
            sx={{ 
              width: '100%', 
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
            }}
          >
            {sucesso}
          </Alert>
        </Snackbar>

        {/* Cabeçalho */}
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
              <AssignmentIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                Relatório de Separação
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="500">
                Acompanhamento e validação de conferências de pedidos
              </Typography>
            </Box>
          </Stack>
          
          <Tooltip title="O domínio de pedidos refere-se ao processo interno de separação e conferência no armazém.">
            <Chip 
              icon={<WarningIcon sx={{ color: '#0369a1 !important' }} />}
              label="Domínio de Pedidos" 
              sx={{ 
                bgcolor: alpha('#0ea5e9', 0.1), 
                color: '#0369a1',
                fontWeight: 700,
                borderRadius: '8px',
                border: `1px solid ${alpha('#0ea5e9', 0.2)}`
              }} 
            />
          </Tooltip>
        </MotionBox>

        {/* Filtros */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          sx={{ mb: 4 }}
        >
          <MotionPaper elevation={0} sx={{ p: 3, borderRadius: '24px', ...glassStyles }}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2, 
                  bgcolor: alpha('#3b82f6', 0.1), 
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FilterListIcon />
                </Box>
                <Typography variant="h6" fontWeight="800" color="text.primary">Filtros e Busca</Typography>
              </Stack>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Buscar por pedido, separador ou conferente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                    }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    fullWidth
                    label="Data Início"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value ? new Date(e.target.value) : null})}
                    InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    fullWidth
                    label="Data Fim"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) => setFiltros({...filtros, dataFim: e.target.value ? new Date(e.target.value) : null})}
                    InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontWeight: 600 }}>Status</InputLabel>
                    <Select
                      value={filtros.status}
                      label="Status"
                      onChange={(e) => setFiltros({...filtros, status: e.target.value as any})}
                      sx={{ borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }}
                    >
                      <MenuItem value="todos">Todos os registros</MenuItem>
                      <MenuItem value="com-inconsistencia">Com Inconsistência</MenuItem>
                      <MenuItem value="sem-inconsistencia">Sem Inconsistência</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {pedidosFiltrados.length} registro(s) encontrado(s)
                </Typography>
                <Button 
                  size="small" 
                  variant="text" 
                  startIcon={<RefreshIcon />}
                  onClick={carregarPedidos}
                  disabled={carregando}
                  sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none' }}
                >
                  Atualizar Lista
                </Button>
              </Stack>
            </Stack>
          </MotionPaper>
        </MotionBox>

        {/* Tabela de Pedidos */}
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          elevation={0}
          sx={{ 
            width: '100%', 
            overflow: 'hidden', 
            borderRadius: '24px',
            ...glassStyles
          }}
        >
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Nº Pedido</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Data / Hora</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Separador</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Conferente</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="center">Conferência</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="center">Validação</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence mode="wait">
                  {carregando ? (
                    <MotionTableRow initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <TableCell colSpan={7} align="center" sx={{ py: 12 }}>
                        <Stack spacing={3} alignItems="center">
                          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main', opacity: 0.2 }} />
                            <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main', position: 'absolute', strokeLinecap: 'round' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" fontWeight="600">Sincronizando pedidos...</Typography>
                        </Stack>
                      </TableCell>
                    </MotionTableRow>
                  ) : pedidosPaginados.length === 0 ? (
                    <MotionTableRow initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <TableCell colSpan={7} align="center" sx={{ py: 12 }}>
                        <Stack spacing={2} alignItems="center">
                          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha('#94a3b8', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                            <SearchIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                          </Box>
                          <Typography variant="h6" fontWeight="800" color="text.primary">Nenhum pedido encontrado</Typography>
                          <Typography variant="body2" color="text.secondary" fontWeight="500">Tente ajustar os filtros de busca</Typography>
                        </Stack>
                      </TableCell>
                    </MotionTableRow>
                  ) : (
                    pedidosPaginados.map((pedido, index) => (
                      <MotionTableRow 
                        key={pedido.id} 
                        hover
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        sx={{ '&:hover': { bgcolor: alpha('#f1f5f9', 0.5) } }}
                      >
                        <TableCell>
                          <Chip 
                            label={pedido.numeroPedido} 
                            variant="filled" 
                            size="small" 
                            sx={{ fontWeight: 800, borderRadius: '6px', bgcolor: alpha('#3b82f6', 0.1), color: '#2563eb' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <DateRangeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
                            <Typography variant="body2" fontWeight="600">
                              {format(new Date(pedido.dataCriacao), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700, bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}>
                              {pedido.controle?.separador?.nome.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600" color="text.primary">
                              {pedido.controle?.separador?.nome.split(' ')[0] || 'Não atribuído'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}>
                              {pedido.conferido?.conferente?.nome.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600" color="text.primary">
                              {pedido.conferido?.conferente?.nome.split(' ')[0] || 'Não conferido'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          {pedido.conferido ? (
                            <Chip 
                              icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                              label="Conferido" 
                              size="small"
                              sx={{ fontWeight: 800, borderRadius: '8px', bgcolor: alpha('#10b981', 0.1), color: '#059669' }}
                            />
                          ) : (
                            <Chip 
                              icon={<PendingIcon sx={{ fontSize: '1rem !important' }} />}
                              label="Pendente" 
                              size="small"
                              sx={{ fontWeight: 800, borderRadius: '8px', bgcolor: alpha('#f59e0b', 0.1), color: '#d97706' }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {pedido.conferido ? (
                            <Chip 
                              label={pedido.conferido.statusValidacao.replace('VALIDADO_', '').replace('PENDENTE', 'Pendente')}
                              size="small"
                              sx={{ 
                                fontWeight: 800, 
                                borderRadius: '8px',
                                bgcolor: alpha(
                                  pedido.conferido.statusValidacao === 'VALIDADO_CORRETO' ? '#10b981' :
                                  pedido.conferido.statusValidacao === 'VALIDADO_INCORRETO' ? '#ef4444' : '#64748b', 
                                  0.1
                                ),
                                color: 
                                  pedido.conferido.statusValidacao === 'VALIDADO_CORRETO' ? '#059669' :
                                  pedido.conferido.statusValidacao === 'VALIDADO_INCORRETO' ? '#dc2626' : '#475569',
                              }}
                            />
                          ) : (
                            <Typography variant="caption" fontWeight="700" color="text.disabled">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title={pedido.conferido ? 'Ver Detalhes' : 'Conferir Pedido'}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleAbrirModal(pedido)}
                                sx={{ 
                                  borderRadius: '8px', 
                                  fontWeight: 700, 
                                  textTransform: 'none',
                                  boxShadow: 'none',
                                  '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }
                                }}
                              >
                                {pedido.conferido ? 'Detalhes' : 'Conferir'}
                              </Button>
                            </Tooltip>
                            {user?.tipo === 'GERENTE' && pedido.conferido && pedido.conferido.statusValidacao === 'PENDENTE' && (
                              <>
                                <Tooltip title="Validar como Correto">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleValidarPedido(pedido.conferido!.id, 'VALIDADO_CORRETO')}
                                    disabled={validando[pedido.conferido.id]}
                                    sx={{ bgcolor: alpha('#10b981', 0.1), '&:hover': { bgcolor: alpha('#10b981', 0.2) } }}
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Validar como Incorreto">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleValidarPedido(pedido.conferido!.id, 'VALIDADO_INCORRETO')}
                                    disabled={validando[pedido.conferido.id]}
                                    sx={{ bgcolor: alpha('#ef4444', 0.1), '&:hover': { bgcolor: alpha('#ef4444', 0.2) } }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </MotionTableRow>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={pedidosFiltrados.length}
            rowsPerPage={linhasPorPagina}
            page={pagina}
            onPageChange={handleMudarPagina}
            onRowsPerPageChange={handleMudarLinhasPorPagina}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{ borderTop: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}
          />
        </MotionPaper>
      </Container>

      {/* Modal de Conferência */}
      <AnimatePresence>
        {modalAberto && (
          <Dialog 
            open={modalAberto} 
            onClose={handleFecharModal} 
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
                  bgcolor: alpha('#3b82f6', 0.1), 
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssignmentIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="800">
                    {pedidoSelecionado?.conferido ? 'Detalhes da Conferência' : 'Registrar Conferência'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pedido #{pedidoSelecionado?.numeroPedido}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ px: 3, mt: 2 }}>
              {pedidoSelecionado && (
                <Stack spacing={3}>
                  <MotionPaper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#f8fafc', 0.5), border: `1px solid ${alpha('#e2e8f0', 0.5)}` }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <LocalShippingIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="subtitle2" fontWeight="700">Dados do Controle</Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="700">MOTORISTA</Typography>
                        <Typography variant="body2" fontWeight="600">{pedidoSelecionado.controle?.motorista || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="700">TRANSPORTADORA</Typography>
                        <Typography variant="body2" fontWeight="600">{pedidoSelecionado.controle?.transportadora || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" fontWeight="700">RESPONSÁVEL</Typography>
                        <Typography variant="body2" fontWeight="600">{pedidoSelecionado.controle?.responsavel || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </MotionPaper>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ fontWeight: 600 }}>Pedido 100%</InputLabel>
                        <Select
                          value={pedido100}
                          label="Pedido 100%"
                          onChange={(e) => setPedido100(e.target.value)}
                          disabled={!!pedidoSelecionado.conferido}
                          sx={{ borderRadius: '12px' }}
                        >
                          <MenuItem value="sim">Sim</MenuItem>
                          <MenuItem value="nao">Não</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ fontWeight: 600 }}>Inconsistência</InputLabel>
                        <Select
                          value={inconsistencia}
                          label="Inconsistência"
                          onChange={(e) => setInconsistencia(e.target.value)}
                          disabled={!!pedidoSelecionado.conferido}
                          sx={{ borderRadius: '12px' }}
                        >
                          <MenuItem value="sim">Sim</MenuItem>
                          <MenuItem value="nao">Não</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {inconsistencia === 'sim' && (
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontWeight: 600 }}>Motivos da Inconsistência</InputLabel>
                          <Select
                            multiple
                            value={motivos}
                            onChange={handleMotivoChange}
                            input={<OutlinedInput label="Motivos da Inconsistência" sx={{ borderRadius: '12px' }} />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                  <Chip key={value} label={value} size="small" sx={{ borderRadius: '6px', fontWeight: 700, bgcolor: alpha('#3b82f6', 0.1), color: 'primary.main' }} />
                                ))}
                              </Box>
                            )}
                            disabled={!!pedidoSelecionado.conferido}
                          >
                            {MOTIVOS_INCONSISTENCIA.map((motivo) => (
                              <MenuItem key={motivo} value={motivo}>
                                <Checkbox checked={motivos.indexOf(motivo) > -1} />
                                <ListItemText primary={motivo} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Observações"
                        multiline
                        rows={3}
                        placeholder="Adicione observações relevantes..."
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        disabled={!!pedidoSelecionado.conferido}
                        InputProps={{ sx: { borderRadius: '12px' } }}
                      />
                    </Grid>

                    {pedidoSelecionado.conferido && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                          <strong>Conferente:</strong> {pedidoSelecionado.conferido.conferente?.nome || 'Não atribuído'}
                          <br />
                          <strong>Data da Conferência:</strong>{' '}
                          {format(new Date(pedidoSelecionado.conferido.dataCriacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 4, pt: 2, gap: 1.5 }}>
              <Button 
                onClick={handleFecharModal}
                color="inherit"
                sx={{ borderRadius: '12px', fontWeight: 700, px: 3, textTransform: 'none', color: 'text.secondary' }}
              >
                Fechar
              </Button>
              {!pedidoSelecionado?.conferido && (
                <Button 
                  onClick={handleSalvarConferencia}
                  variant="contained"
                  disabled={inconsistencia === 'sim' && motivos.length === 0}
                  sx={{ 
                    borderRadius: '12px', 
                    fontWeight: 800, 
                    px: 4,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)' },
                    transition: 'all 0.2s'
                  }}
                >
                  Salvar Conferência
                </Button>
              )}
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>
    </Box>
  );
}

export default PaginaConferenciaPedidos;
