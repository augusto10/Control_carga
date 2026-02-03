import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Stack,
  Avatar,
  LinearProgress,
  Button,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VisualPageLayout from '../../../components/VisualPageLayout';
import AdminRoute from '../../../components/AdminRoute';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

interface PedidoStatus {
  ORCAMENTO_ID: number;
  CLIENTE_NOME: string;
  NOME_FANTASIA: string;
  DATA_HORA_CADASTRO: string;
  DATA_HORA_RECEBIMENTO: string | null;
  DATA_ENTREGA: string | null;
  VALOR_PEDIDO: number;
  TIPO_ENTREGA: string;
  VENDEDOR_NOME: string;
  PEDIDO_FECHADO: string;
  CANCELADO: string;
  SEPARADO_PARA_RECEBIMENTO: string | null;
  ENTREGA_POR_TRANSPORTADORA: string | null;
  CEP_ENTREGA: string | null;
  LOGRADOURO_ENTREGA: string | null;
  NUMERO_NOTA?: string | null;
}

interface PedidosResponse {
  total: number;
  limit: number;
  offset: number;
  data: PedidoStatus[];
}

interface ApuracaoItem {
  ORCAMENTO_BASE_ID?: number;
  NUMERO_NOTA?: string;
  DATA_EMISSAO?: string;
  IDENTIFICACAO_NFE?: string;
  [key: string]: any;
}

interface ApuracoesResponse {
  total: number;
  limit: number;
  offset: number;
  data: ApuracaoItem[];
}

const parseApuracaoId = (value: unknown) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !Number.isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
  }
  return null;
};

const getApuracaoId = (apuracao: ApuracaoItem) => {
  const data = apuracao as Record<string, unknown>;
  return (
    parseApuracaoId(data.ORCAMENTO_BASE_ID) ??
    parseApuracaoId(data.ORCAMENTO_ID) ??
    parseApuracaoId(data.ORCAMENTO) ??
    parseApuracaoId(data.ORCAMENTOBASEID) ??
    parseApuracaoId(data.ORCAMENTO_BASE) ??
    parseApuracaoId(data.ORCAMENTOBASE)
  );
};

const buildApuracoesMap = (items: ApuracaoItem[]) =>
  new Map(
    items
      .map((a) => {
        const id = getApuracaoId(a);
        return id !== null ? [id, a] : null;
      })
      .filter((entry): entry is [number, ApuracaoItem] => entry !== null)
  );

type StatusFiltro = 'todos' | 'separacao' | 'separado' | 'aguardando-entrega';

function StatusPedidosContent() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    separacao: 0,
    separado: 0,
    aguardandoEntrega: 0
  });

  // Carregar pedidos quando o componente for montado
  useEffect(() => {
    carregarPedidos();
  }, []);

  useEffect(() => {
    calcularEstatisticas();
  }, [pedidos]);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      
      const pedidosUrl = '/api/pedidos/externos?limit=100&offset=0';
      const response = await fetch(pedidosUrl, {
        headers: {
          accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data: PedidosResponse = await response.json();

      const pedidosBase = data.data || [];
      const datas = pedidosBase
        .map((p) => {
          const dataCand = p.DATA_HORA_RECEBIMENTO || p.DATA_HORA_CADASTRO || p.DATA_ENTREGA;
          if (!dataCand) return null;
          const d = new Date(dataCand);
          return Number.isNaN(d.getTime()) ? null : d;
        })
        .filter((d): d is Date => !!d);

      const minDate = datas.length ? new Date(Math.min(...datas.map((d) => d.getTime()))) : null;
      const maxDate = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;
      const dataInicio = minDate ? format(minDate, 'yyyy-MM-dd') : undefined;
      const dataFim = maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined;

      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      if (dataInicio) apuracoesUrl.searchParams.set('data_inicio', dataInicio);
      if (dataFim) apuracoesUrl.searchParams.set('data_fim', dataFim);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      let apuracoesMap = new Map<number, ApuracaoItem>();
      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        if (apuracoesMap.size === 0 && (dataInicio || dataFim)) {
          const apuracoesFallbackUrl = new URL('/api/apuracoes', window.location.origin);
          apuracoesFallbackUrl.searchParams.set('limit', '10000');
          apuracoesFallbackUrl.searchParams.set('offset', '0');
          const apuracoesFallbackResponse = await fetch(apuracoesFallbackUrl.toString(), {
            headers: { accept: 'application/json' }
          });
          if (apuracoesFallbackResponse.ok) {
            const apuracoesFallbackData: ApuracoesResponse = await apuracoesFallbackResponse.json();
            apuracoesMap = buildApuracoesMap(apuracoesFallbackData.data || []);
          }
        }
      }

      const pedidosEnriquecidos = pedidosBase.map((p) => {
        const apuracao = apuracoesMap.get(p.ORCAMENTO_ID);
        if (!apuracao) return p;
        return {
          ...p,
          NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null
        };
      });

      setPedidos(pedidosEnriquecidos);
    } catch (error: unknown) {
      console.error('Erro ao carregar pedidos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar pedidos';
      setError(`Erro ao carregar pedidos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = () => {
    const total = pedidos.length;
    let separacao = 0;
    let separado = 0;
    let aguardandoEntrega = 0;

    pedidos.forEach(p => {
      const status = determinarStatusPedido(p);
      if (status.status === 'separacao') {
        separacao += 1;
      } else if (status.status === 'separado') {
        separado += 1;
      } else if (status.status === 'aguardando-entrega') {
        aguardandoEntrega += 1;
      }
    });

    setStats({
      total,
      separacao,
      separado,
      aguardandoEntrega
    });
  };

  const determinarStatusPedido = (pedido: PedidoStatus): { status: StatusFiltro, label: string, color: 'warning' | 'success' | 'info' | 'error' | 'default', icon: React.ReactElement } => {
    if (pedido.CANCELADO === 'S') {
      return {
        status: 'todos',
        label: 'Cancelado',
        color: 'error',
        icon: <ErrorIcon />
      };
    }

    // Prioridade 1: Nota Gerada (Aguardando Entrega)
    if (pedido.NUMERO_NOTA) {
      return {
        status: 'aguardando-entrega',
        label: 'Aguardando Entrega',
        color: 'info',
        icon: <ScheduleIcon />
      };
    }

    // Prioridade 2: Entregue (Adicionado status entregue se necessário no futuro, por enquanto mantém lógica anterior ou ajusta conforme ciclo)
    // Se DATA_ENTREGA existe e não tem nota, tecnicamente já foi entregue ou é um estado inconsistente?
    // Mantendo coerência com o Ciclo: se tem DATA_ENTREGA, é entregue. Mas aqui os filtros são específicos.
    // Vamos manter a lógica de "Separado" se tiver separado e sem nota.

    // Prioridade 3: Em Separação
    if (pedido.SEPARADO_PARA_RECEBIMENTO === 'N' && pedido.PEDIDO_FECHADO === 'S') {
      return {
        status: 'separacao',
        label: 'Em Separação',
        color: 'warning',
        icon: <PendingIcon />
      };
    }

    // Prioridade 4: Separado
    if (pedido.SEPARADO_PARA_RECEBIMENTO === 'S') {
      return {
        status: 'separado',
        label: 'Separado',
        color: 'success',
        icon: <CheckCircleIcon />
      };
    }

    return {
      status: 'todos',
      label: 'Outro',
      color: 'default',
      icon: <InventoryIcon />
    };
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const pedidoSelecionado = router.query.pedido
      ? Number(router.query.pedido as string)
      : null;

    if (pedidoSelecionado && pedido.ORCAMENTO_ID !== pedidoSelecionado) {
      return false;
    }

    if (filtroStatus === 'todos') return true;
    
    const status = determinarStatusPedido(pedido);
    return status.status === filtroStatus;
  });

  const formatarData = (dataString: string | null) => {
    if (!dataString) return '-';
    try {
      return format(parseISO(dataString), "dd/MM/yy HH:mm", { locale: ptBR });
    } catch {
      return dataString;
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleFiltroChange = (
    event: React.MouseEvent<HTMLElement>,
    newFiltro: StatusFiltro | null,
  ) => {
    if (newFiltro !== null) {
      setFiltroStatus(newFiltro);
    }
  };

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <MotionPaper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.success.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.info.main, 0.3)}`
            }}
          >
            <InventoryIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Painel de Status dos Pedidos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Acompanhe o ciclo completo dos pedidos: separação, separado e aguardando entrega
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Atualizar lista">
              <IconButton
                onClick={carregarPedidos}
                disabled={loading}
                sx={{
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.1)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)} 0%, ${alpha(theme.palette.info.dark, 0.2)} 100%)`,
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </MotionPaper>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.05)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <TrendingUpIcon color="primary" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Pedidos
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.1)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                  <PendingIcon color="warning" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {stats.separacao}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Em Separação
                  </Typography>
                </Box>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={stats.total > 0 ? (stats.separacao / stats.total) * 100 : 0}
                color="warning"
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.1)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                  <CheckCircleIcon color="success" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.separado}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Separados
                  </Typography>
                </Box>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={stats.total > 0 ? (stats.separado / stats.total) * 100 : 0}
                color="success"
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.info.main, 0.1)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                  <ScheduleIcon color="info" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.aguardandoEntrega}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aguardando Entrega
                  </Typography>
                </Box>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={stats.total > 0 ? (stats.aguardandoEntrega / stats.total) * 100 : 0}
                color="info"
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>

      {/* Filtros de Status */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600} color="primary.main">
            Filtrar por Status
          </Typography>
          <ToggleButtonGroup
            value={filtroStatus}
            exclusive
            onChange={handleFiltroChange}
            aria-label="status do pedido"
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <ToggleButton value="todos" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="body2">Todos ({stats.total})</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="separacao" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PendingIcon fontSize="small" color="warning" />
                <Typography variant="body2">Em Separação ({stats.separacao})</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="separado" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography variant="body2">Separados ({stats.separado})</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="aguardando-entrega" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScheduleIcon fontSize="small" color="info" />
                <Typography variant="body2">Aguardando Entrega ({stats.aguardandoEntrega})</Typography>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </MotionPaper>

      {/* Tabela de Pedidos */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.05)}`,
          backdropFilter: 'blur(10px)',
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer
              sx={{
                maxHeight: { xs: 400, md: 600 },
                overflow: 'auto',
                '& .MuiTableCell-root': {
                  whiteSpace: 'nowrap',
                  px: 1.5,
                  py: 1,
                  fontSize: '0.8rem'
                }
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Nº Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Nº Nota</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Cliente</TableCell>
                    {/* <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Status</TableCell> */}
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Data Recebimento</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Data Entrega</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Valor</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Endereço</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Vendedor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          Nenhum pedido encontrado com os filtros atuais.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidosFiltrados.map((pedido, index) => {
                      const status = determinarStatusPedido(pedido);
                      const pedidoSelecionado = router.query.pedido
                        ? Number(router.query.pedido as string)
                        : null;
                      const selecionado = pedidoSelecionado === pedido.ORCAMENTO_ID;
                      return (
                        <TableRow
                          key={pedido.ORCAMENTO_ID}
                          hover
                          sx={{
                            background: selecionado
                              ? alpha(theme.palette.success.main, 0.08)
                              : 'transparent',
                            '&:hover': {
                              background: alpha(theme.palette.primary.main, 0.03),
                            },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {pedido.ORCAMENTO_ID}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {pedido.NUMERO_NOTA || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="column" spacing={0.5}>
                              <Typography variant="body2" fontWeight={600}>
                                {pedido.CLIENTE_NOME || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pedido.NOME_FANTASIA || '-'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatarData(pedido.DATA_HORA_RECEBIMENTO)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatarData(pedido.DATA_ENTREGA)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatarValor(pedido.VALOR_PEDIDO)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {pedido.LOGRADOURO_ENTREGA || '-'}
                              {pedido.CEP_ENTREGA && ` (CEP: ${pedido.CEP_ENTREGA})`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {pedido.VENDEDOR_NOME || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Footer com estatísticas */}
            <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
                </Typography>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="outlined"
                  size="small"
                >
                  Exportar
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </MotionPaper>
    </Container>
  );
}

const StatusPedidosPage: NextPage = () => {
  return (
    <AdminRoute>
      <Head>
        <title>Status dos Pedidos - Sistema de Controle de Carga</title>
        <meta name="description" content="Acompanhe o status dos pedidos: separação, separado e aguardando entrega" />
      </Head>
      <VisualPageLayout
        title="Status dos Pedidos"
        subtitle="Acompanhe o ciclo completo dos pedidos"
      >
        <StatusPedidosContent />
      </VisualPageLayout>
    </AdminRoute>
  );
};

export default StatusPedidosPage;
