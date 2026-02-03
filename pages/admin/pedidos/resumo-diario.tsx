import { NextPage } from 'next';
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
  Stack,
  Avatar,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Today as TodayIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  MonetizationOn as MonetizationOnIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VisualPageLayout from '../../../components/VisualPageLayout';
import AdminRoute from '../../../components/AdminRoute';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

interface PedidoResumo {
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
  NUMERO_NOTA?: string | null;
}

interface PedidosResponse {
  total: number;
  limit: number;
  offset: number;
  data: PedidoResumo[];
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

function ResumoDiarioContent() {
  const theme = useTheme();
  const [dataReferencia, setDataReferencia] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalValor: 0,
    entregas: 0,
    naoEntrega: 0,
    emSeparacao: 0,
    separados: 0,
    aguardandoEntrega: 0,
    cancelados: 0
  });

  useEffect(() => {
    carregarPedidos();
  }, [dataReferencia]);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/pedidos/externos?limit=10000&offset=0&data_inicio=${dataReferencia}&data_fim=${dataReferencia}`;
      const response = await fetch(url, {
        headers: {
          accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data: PedidosResponse = await response.json();

      const pedidosBase = data.data || [];

      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      apuracoesUrl.searchParams.set('data_inicio', dataReferencia);
      apuracoesUrl.searchParams.set('data_fim', dataReferencia);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      let apuracoesMap = new Map<number, ApuracaoItem>();
      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        if (apuracoesMap.size === 0) {
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
      calcularEstatisticas(pedidosEnriquecidos);
    } catch (error: unknown) {
      console.error('Erro ao carregar pedidos do resumo diário:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao carregar pedidos';
      setError(`Erro ao carregar pedidos: ${errorMessage}`);
      setPedidos([]);
      setStats({
        totalPedidos: 0,
        totalValor: 0,
        entregas: 0,
        naoEntrega: 0,
        emSeparacao: 0,
        separados: 0,
        aguardandoEntrega: 0,
        cancelados: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (lista: PedidoResumo[]) => {
    const totalPedidos = lista.length;
    const totalValor = lista.reduce(
      (acc, p) => acc + (p.VALOR_PEDIDO || 0),
      0
    );
    const entregas = lista.filter(
      p => p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO'
    ).length;
    const naoEntrega = lista.filter(
      p => p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO'
    ).length;
    const emSeparacao = lista.filter(
      p =>
        p.SEPARADO_PARA_RECEBIMENTO === 'N' &&
        p.PEDIDO_FECHADO === 'S' &&
        !p.NUMERO_NOTA
    ).length;
    const separados = lista.filter(
      p => p.SEPARADO_PARA_RECEBIMENTO === 'S' && !p.DATA_ENTREGA && !p.NUMERO_NOTA
    ).length;
    const aguardandoEntrega = lista.filter(
      p => !!p.NUMERO_NOTA && p.CANCELADO !== 'S'
    ).length;
    const cancelados = lista.filter(p => p.CANCELADO === 'S').length;

    setStats({
      totalPedidos,
      totalValor,
      entregas,
      naoEntrega,
      emSeparacao,
      separados,
      aguardandoEntrega,
      cancelados
    });
  };

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
    }).format(valor || 0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <MotionPaper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          spacing={2}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.info.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.3)}`
            }}
          >
            <TodayIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography
              variant="h4"
              fontWeight="bold"
              color="primary.main"
              gutterBottom
            >
              Resumo Diário de Pedidos e Entregas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Visão consolidada dos pedidos e entregas por dia.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="date"
              label="Data de referência"
              value={dataReferencia}
              onChange={e => setDataReferencia(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Tooltip title="Recarregar">
              <span>
                <IconButton
                  onClick={carregarPedidos}
                  disabled={loading}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.info.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.info.dark, 0.1)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(
                        theme.palette.info.main,
                        0.2
                      )} 0%, ${alpha(
                        theme.palette.info.dark,
                        0.2
                      )} 100%)`
                    }
                  }}
                >
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </MotionPaper>

      {error && (
        <Box sx={{ mb: 3 }}>
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
                color: theme.palette.error.main
              },
              boxShadow: `0 8px 32px 0 ${alpha(
                theme.palette.common.black,
                0.1
              )}`,
              fontWeight: 600
            }}
          >
            {error}
          </Alert>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.background.paper,
                0.9
              )} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <InventoryIcon color="primary" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalPedidos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pedidos no dia
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
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(
                theme.palette.success.main,
                0.1
              )}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.success.main,
                0.05
              )} 0%, ${alpha(
                theme.palette.success.light,
                0.05
              )} 100%)`
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                  <MonetizationOnIcon color="success" />
                </Avatar>
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatarValor(stats.totalValor)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor total
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
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.info.main, 0.1)}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.info.main,
                0.05
              )} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                  <LocalShippingIcon color="info" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.entregas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entregas
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
            transition={{ duration: 0.5, delay: 0.4 }}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(
                theme.palette.warning.main,
                0.1
              )}`,
              backdropFilter: 'blur(10px)',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.warning.main,
                0.05
              )} 0%, ${alpha(
                theme.palette.warning.light,
                0.05
              )} 100%)`
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                  <PendingIcon color="warning" />
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="warning.main"
                  >
                    {stats.naoEntrega}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Não entrega
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(
                theme.palette.common.black,
                0.05
              )}`,
              backdropFilter: 'blur(10px)'
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={600}
              color="primary.main"
              gutterBottom
            >
              Situação dos pedidos
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon sx={{ color: theme.palette.success.main }} />
                <Typography variant="body2" flex={1}>
                  Separados
                </Typography>
                <Chip
                  label={stats.separados}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <PendingIcon sx={{ color: theme.palette.warning.main }} />
                <Typography variant="body2" flex={1}>
                  Em separação
                </Typography>
                <Chip
                  label={stats.emSeparacao}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <ScheduleIcon sx={{ color: theme.palette.info.main }} />
                <Typography variant="body2" flex={1}>
                  Aguardando entrega
                </Typography>
                <Chip
                  label={stats.aguardandoEntrega}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <CancelIcon sx={{ color: theme.palette.error.main }} />
                <Typography variant="body2" flex={1}>
                  Cancelados
                </Typography>
                <Chip
                  label={stats.cancelados}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </MotionPaper>
        </Grid>

        <Grid item xs={12} md={8}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(
                theme.palette.common.black,
                0.05
              )}`,
              backdropFilter: 'blur(10px)'
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={600}
              color="primary.main"
              gutterBottom
            >
              Principais pedidos do dia
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : pedidos.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum pedido encontrado na data selecionada.
                </Typography>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  maxHeight: { xs: 300, md: 360 }
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: alpha(theme.palette.primary.main, 0.05)
                      }}
                    >
                      <TableCell>Nº Pedido</TableCell>
                      <TableCell>Nº Nota</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell>Entrega</TableCell>
                      <TableCell>Recebimento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedidos.slice(0, 50).map(pedido => (
                      <TableRow key={pedido.ORCAMENTO_ID} hover>
                        <TableCell>{pedido.ORCAMENTO_ID}</TableCell>
                        <TableCell>{pedido.NUMERO_NOTA || '-'}</TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>
                              {pedido.CLIENTE_NOME || '-'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pedido.NOME_FANTASIA || '-'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="success.main"
                          >
                            {formatarValor(pedido.VALOR_PEDIDO)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              pedido.TIPO_ENTREGA === 'NDF' ||
                              pedido.TIPO_ENTREGA === 'ATO'
                                ? 'Não entrega'
                                : 'Entrega'
                            }
                            size="small"
                            color={
                              pedido.TIPO_ENTREGA === 'NDF' ||
                              pedido.TIPO_ENTREGA === 'ATO'
                                ? 'default'
                                : 'success'
                            }
                            icon={
                              pedido.TIPO_ENTREGA === 'NDF' ||
                              pedido.TIPO_ENTREGA === 'ATO'
                                ? undefined
                                : <LocalShippingIcon />
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatarData(pedido.DATA_HORA_RECEBIMENTO)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </MotionPaper>
        </Grid>
      </Grid>
    </Container>
  );
}

const ResumoDiarioPage: NextPage = () => {
  return (
    <AdminRoute>
      <Head>
        <title>Resumo Diário de Pedidos - Sistema de Controle de Carga</title>
        <meta
          name="description"
          content="Resumo diário de pedidos e entregas"
        />
      </Head>
      <VisualPageLayout
        title="Resumo Diário de Pedidos"
        subtitle="Acompanhe o desempenho diário de pedidos e entregas"
      >
        <ResumoDiarioContent />
      </VisualPageLayout>
    </AdminRoute>
  );
};

export default ResumoDiarioPage;
