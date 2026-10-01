import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RouteIcon from '@mui/icons-material/Route';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import { AppLayout } from '@/components/layout/AppLayout';

type KanbanStatus =
  | 'EM_PREPARACAO'
  | 'ENVIADO_TRANSPORTADORA'
  | 'EM_ROTA_ENTREGA'
  | 'PEDIDO_ENTREGUE';

type PedidoKanban = {
  id: string;
  pedidoId: number;
  clienteId: number;
  clienteNome: string;
  vendedorId: number;
  vendedorNome: string;
  valor: number;
  dataHoraCadastro: string | null;
  dataEntrega: string | null;
  tipoEntrega: string | null;
  status: KanbanStatus;
  statusLabel: string;
  separacaoStatus: string | null;
  separacaoStatusLabel: string | null;
  numeroNota: string | null;
  identificacaoNfe: string | null;
  controleId: string | null;
  controleDataCriacao: string | null;
  controleTransportadora: string | null;
  sswStatus: string | null;
  sswMensagem: string | null;
  trackingDeliveredAt: string | null;
  trackingReceiverName: string | null;
  trackingPhotoUrl: string | null;
  trackingOccurrences: Array<{
    dataHora: string | null;
    ocorrencia: string | null;
    descricao: string | null;
    cidade: string | null;
    dominio: string | null;
  }>;
  observacaoStatus: string | null;
};

type KanbanResponse = {
  dataReferencia: string;
  dataInicio: string;
  generatedAt: string;
  totals: Record<KanbanStatus, number>;
  columns: Record<KanbanStatus, PedidoKanban[]>;
};

type PedidoDetalheApiResponse = {
  pedido: Record<string, unknown>;
  logistica: {
    pedido?: Record<string, unknown> | null;
    status_logistico?: Record<string, unknown> | null;
    separacoes?: Record<string, unknown>[];
    itens_separacoes?: Record<string, unknown>[];
    entregas?: Record<string, unknown>[];
    notas_fiscais?: Record<string, unknown>[];
  } | null;
};

const STATUS_META: Record<
  KanbanStatus,
  {
    title: string;
    color: string;
    bg: string;
    icon: typeof Inventory2Icon;
  }
> = {
  EM_PREPARACAO: {
    title: 'Em preparacao',
    color: '#f59e0b',
    bg: '#fff7e6',
    icon: Inventory2Icon,
  },
  ENVIADO_TRANSPORTADORA: {
    title: 'Enviado para transportadora',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: LocalShippingIcon,
  },
  EM_ROTA_ENTREGA: {
    title: 'Em rota de entrega',
    color: '#ea580c',
    bg: '#fff7ed',
    icon: RouteIcon,
  },
  PEDIDO_ENTREGUE: {
    title: 'Pedido entregue',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: AssignmentTurnedInIcon,
  },
};

const STATUS_ORDER: KanbanStatus[] = [
  'EM_PREPARACAO',
  'ENVIADO_TRANSPORTADORA',
  'EM_ROTA_ENTREGA',
  'PEDIDO_ENTREGUE',
];

function formatMoney(value: number | null | undefined): string {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function formatText(value: unknown, fallback = '-'): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function getTodayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function getSeparacaoChipColor(status: string | null): 'default' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'A':
      return 'default';
    case 'S':
      return 'warning';
    case 'E':
      return 'info';
    case 'G':
      return 'success';
    default:
      return 'default';
  }
}

function PedidoCard({ pedido, onOpen }: { pedido: PedidoKanban; onOpen: (pedido: PedidoKanban) => void }) {
  return (
    <Paper
      variant="outlined"
      onClick={() => onOpen(pedido)}
      sx={{
        p: 1,
        borderRadius: 2,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <Stack spacing={0.65}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', lineHeight: 1.15 }}>
              Pedido #{pedido.pedidoId}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, fontSize: '0.68rem' }}>
              {pedido.statusLabel}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={formatMoney(pedido.valor)}
            sx={{
              fontWeight: 700,
              height: 22,
              '& .MuiChip-label': { px: 0.9, fontSize: '0.68rem' },
              backgroundColor: 'rgba(22, 163, 74, 0.12)',
              color: '#166534',
            }}
          />
        </Stack>

        <Box>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              display: '-webkit-box',
              lineHeight: 1.15,
              fontSize: '0.72rem',
              overflow: 'hidden',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {pedido.clienteNome}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontSize: '0.66rem' }}>
            Cliente #{pedido.clienteId || '-'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <PersonOutlineIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              lineHeight: 1.1,
              fontSize: '0.66rem',
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            Representante: {pedido.vendedorNome}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <ReceiptLongIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontSize: '0.66rem' }}>
            NFe: {pedido.numeroNota || 'sem numero'}
          </Typography>
        </Stack>

        {pedido.separacaoStatusLabel && (
          <Box>
            <Chip
              size="small"
              color={getSeparacaoChipColor(pedido.separacaoStatus)}
              label={`Separacao: ${pedido.separacaoStatusLabel}`}
              sx={{
                fontWeight: 700,
                height: 20,
                maxWidth: '100%',
                '& .MuiChip-label': {
                  px: 0.8,
                  fontSize: '0.64rem',
                },
              }}
            />
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontSize: '0.64rem' }}>
            Cadastro: {formatDateTime(pedido.dataHoraCadastro)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontSize: '0.64rem' }}>
            Entrega: {formatDateTime(pedido.dataEntrega)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function StatusColumn({
  status,
  pedidos,
  onOpen,
}: {
  status: KanbanStatus;
  pedidos: PedidoKanban[];
  onOpen: (pedido: PedidoKanban) => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const totalValor = useMemo(
    () => pedidos.reduce((sum, pedido) => sum + (pedido.valor || 0), 0),
    [pedidos]
  );

  return (
    <Box
      sx={{
        minWidth: { xs: '100%', md: 320 },
        maxWidth: { xs: '100%', md: 360 },
        flex: 1,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          backgroundColor: '#fff',
        }}
      >
        <Box sx={{ p: 2.25, backgroundColor: meta.bg, borderTop: `4px solid ${meta.color}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: meta.color }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {meta.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {pedidos.length} pedido{pedidos.length === 1 ? '' : 's'}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={pedidos.length}
              size="small"
              sx={{ fontWeight: 700, backgroundColor: '#fff' }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Total da coluna
          </Typography>
          <Typography variant="body2" fontWeight={800} sx={{ color: meta.color }}>
            {formatMoney(totalValor)}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ p: 1.25, minHeight: 520, backgroundColor: '#f8fafc' }}>
          {pedidos.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '1px dashed rgba(15, 23, 42, 0.18)',
                backgroundColor: '#fff',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Nenhum pedido nesta coluna
              </Typography>
            </Box>
          ) : (
            pedidos.map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} onOpen={onOpen} />)
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

export default function PedidosKanbanPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [data, setData] = useState<KanbanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoKanban | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoDetalheApiResponse | null>(null);
  const [loadingPedidoDetalhe, setLoadingPedidoDetalhe] = useState(false);
  const [pedidoDetalheErro, setPedidoDetalheErro] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const [kanbanScrollWidth, setKanbanScrollWidth] = useState(0);
  const pedidoDetalheCacheRef = useRef<Record<number, PedidoDetalheApiResponse>>({});
  const pedidoDetalheRequestRef = useRef<Record<number, Promise<PedidoDetalheApiResponse> | undefined>>({});
  const pedidoSelecionadoRef = useRef<number | null>(null);

  useEffect(() => {
    const container = kanbanScrollRef.current;
    if (!container || isLoading) return;

    const updateWidth = () => setKanbanScrollWidth(container.scrollWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [data, isLoading]);

  const syncScroll = (source: 'top' | 'kanban') => {
    const from = source === 'top' ? topScrollRef.current : kanbanScrollRef.current;
    const to = source === 'top' ? kanbanScrollRef.current : topScrollRef.current;
    if (from && to && to.scrollLeft !== from.scrollLeft) {
      to.scrollLeft = from.scrollLeft;
    }
  };

  const fetchKanban = useCallback(async (dateRef: string, silent = false, forceRefresh = false) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);
      const params = new URLSearchParams({ data: dateRef });
      if (forceRefresh) {
        params.set('refresh', '1');
      }

      const response = await fetch(`/api/kanban-pedidos?${params.toString()}`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao carregar o kanban');
      }

      setData(payload as KanbanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o kanban');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchKanban(selectedDate);
  }, [fetchKanban, selectedDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchKanban(selectedDate, true);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [fetchKanban, selectedDate]);

  const totalPedidos = useMemo(() => {
    if (!data) return 0;
    return STATUS_ORDER.reduce((sum, status) => sum + data.totals[status], 0);
  }, [data]);

  const totalValorGeral = useMemo(() => {
    if (!data) return 0;
    return STATUS_ORDER.reduce((sum, status) => {
      return sum + data.columns[status].reduce((columnSum, pedido) => columnSum + pedido.valor, 0);
    }, 0);
  }, [data]);

  const fetchPedidoDetalhe = useCallback(async (pedidoId: number) => {
    const cached = pedidoDetalheCacheRef.current[pedidoId];
    if (cached) return cached;

    const inFlight = pedidoDetalheRequestRef.current[pedidoId];
    if (inFlight) return inFlight;

    const request = fetch(`/api/pedidos/${pedidoId}/logistica`, {
      credentials: 'include',
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Falha ao carregar pedido (${response.status})`);
      }

      const data: PedidoDetalheApiResponse = await response.json();
      pedidoDetalheCacheRef.current[pedidoId] = data;
      return data;
    }).finally(() => {
      delete pedidoDetalheRequestRef.current[pedidoId];
    });

    pedidoDetalheRequestRef.current[pedidoId] = request;
    return request;
  }, []);

  const abrirDetalhePedido = useCallback(async (pedido: PedidoKanban) => {
    pedidoSelecionadoRef.current = pedido.pedidoId;
    setSelectedPedido(pedido);
    setPedidoDetalheErro(null);

    const cached = pedidoDetalheCacheRef.current[pedido.pedidoId];
    if (cached) {
      setPedidoDetalhe(cached);
      setLoadingPedidoDetalhe(false);
      return;
    }

    setPedidoDetalhe(null);
    setLoadingPedidoDetalhe(true);

    try {
      const data = await fetchPedidoDetalhe(pedido.pedidoId);
      if (pedidoSelecionadoRef.current === pedido.pedidoId) {
        setPedidoDetalhe(data);
      }
    } catch (err) {
      if (pedidoSelecionadoRef.current === pedido.pedidoId) {
        setPedidoDetalheErro(err instanceof Error ? err.message : 'Nao foi possivel carregar os detalhes.');
      }
    } finally {
      if (pedidoSelecionadoRef.current === pedido.pedidoId) {
        setLoadingPedidoDetalhe(false);
      }
    }
  }, [fetchPedidoDetalhe]);

  const fecharDetalhePedido = useCallback(() => {
    pedidoSelecionadoRef.current = null;
    setSelectedPedido(null);
    setPedidoDetalhe(null);
    setPedidoDetalheErro(null);
    setLoadingPedidoDetalhe(false);
  }, []);

  const abrirComprovante = useCallback((url: string | null) => {
    if (!url) return;
    setSelectedPhotoUrl(url);
    setPhotoLoading(true);
    setPhotoError(null);
  }, []);

  const fecharComprovante = useCallback(() => {
    setSelectedPhotoUrl(null);
    setPhotoLoading(false);
    setPhotoError(null);
  }, []);

  const pedidoSeparacoes = Array.isArray(pedidoDetalhe?.logistica?.separacoes)
    ? pedidoDetalhe.logistica?.separacoes || []
    : [];
  const pedidoNotasFiscais = Array.isArray(pedidoDetalhe?.logistica?.notas_fiscais)
    ? pedidoDetalhe.logistica?.notas_fiscais || []
    : [];

  return (
    <AppLayout
      title="Kanban de Pedidos"
      subtitle="Acompanhamento automatico dos pedidos de entrega do dia selecionado"
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Data"
            type="date"
            size="small"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={() => fetchKanban(selectedDate, true, true)}
            disabled={isRefreshing || isLoading}
            startIcon={isRefreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          >
            Atualizar
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 4,
            border: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Resumo do dia
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pedidos de entrega em {selectedDate.split('-').reverse().join('/')}
              </Typography>
              {data?.generatedAt && (
                <Typography variant="caption" color="text.secondary">
                  Atualizado em {formatDateTime(data.generatedAt)}
                </Typography>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip
                label={`${totalPedidos} pedido${totalPedidos === 1 ? '' : 's'}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={formatMoney(totalValorGeral)}
                sx={{
                  fontWeight: 700,
                  backgroundColor: 'rgba(22, 163, 74, 0.12)',
                  color: '#166534',
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={0.75}>
            <Box
              ref={topScrollRef}
              onScroll={() => syncScroll('top')}
              sx={{ overflowX: 'auto', overflowY: 'hidden', height: 17 }}
              aria-label="Rolagem horizontal superior do Kanban"
            >
              <Box sx={{ width: kanbanScrollWidth, height: 1 }} />
            </Box>

            <Box
              ref={kanbanScrollRef}
              onScroll={() => syncScroll('kanban')}
              sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2 }}
            >
              {STATUS_ORDER.map((status) => (
                <StatusColumn
                  key={status}
                  status={status}
                  pedidos={data?.columns[status] || []}
                  onOpen={abrirDetalhePedido}
                />
              ))}
            </Box>
          </Stack>
        )}
      </Stack>

      <Dialog
        open={Boolean(selectedPedido)}
        onClose={fecharDetalhePedido}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 6 }}>
          {selectedPedido ? `Pedido #${selectedPedido.pedidoId}` : 'Detalhes do pedido'}
          <IconButton
            aria-label="Fechar"
            onClick={fecharDetalhePedido}
            sx={{
              position: 'absolute',
              right: 12,
              top: 10,
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPedido && (
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                <Chip label={selectedPedido.statusLabel} color="primary" />
                {selectedPedido.separacaoStatusLabel && (
                  <Chip
                    label={`Separacao: ${selectedPedido.separacaoStatusLabel}`}
                    color={getSeparacaoChipColor(selectedPedido.separacaoStatus)}
                  />
                )}
                {selectedPedido.controleId && <Chip label={`Controle ${selectedPedido.controleId}`} color="info" />}
              </Stack>

              {loadingPedidoDetalhe ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 8 }}>
                  <CircularProgress size={22} />
                  <Typography variant="body2" color="text.secondary">
                    Carregando detalhes do pedido...
                  </Typography>
                </Box>
              ) : pedidoDetalheErro ? (
                <Alert severity="error">{pedidoDetalheErro}</Alert>
              ) : (
                <>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {selectedPedido.clienteNome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Representante: {selectedPedido.vendedorNome}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2, flex: 1.15, borderRadius: 3 }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Informacoes do pedido</Typography>
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">Recebido no caixa: <strong style={{ color: '#0f172a' }}>{formatDateTime(formatText(pedidoDetalhe?.pedido?.DATA_HORA_RECEBIMENTO, '') || null)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Local: <strong style={{ color: '#0f172a' }}>{formatText(selectedPedido.controleTransportadora || pedidoSeparacoes[0]?.LOCAL_NOME)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Nota fiscal: <strong style={{ color: '#0f172a' }}>{formatText(pedidoDetalhe?.pedido?.NUMERO_NOTA, formatText(pedidoNotasFiscais[0]?.NUMERO_NOTA))}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Chave / identificacao: <strong style={{ color: '#0f172a', wordBreak: 'break-all' }}>{formatText(pedidoDetalhe?.pedido?.IDENTIFICACAO_NFE, formatText(pedidoNotasFiscais[0]?.IDENTIFICACAO_NFE))}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Tipo entrega: <strong style={{ color: '#0f172a' }}>{formatText(pedidoDetalhe?.pedido?.TIPO_ENTREGA)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Cidade: <strong style={{ color: '#0f172a' }}>{formatText(pedidoDetalhe?.pedido?.NOME_CIDADE)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Bairro: <strong style={{ color: '#0f172a' }}>{formatText(pedidoDetalhe?.pedido?.NOME_BAIRRO_NOTA)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">UF / CEP: <strong style={{ color: '#0f172a' }}>{`${formatText(pedidoDetalhe?.pedido?.ESTADO_DESTINO)} / ${formatText(pedidoDetalhe?.pedido?.CEP)}`}</strong></Typography>
                        </Stack>
                      </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, flex: 0.95, borderRadius: 3 }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Informacoes da transportadora</Typography>
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">Status SSW: <strong style={{ color: '#0f172a' }}>{selectedPedido.sswStatus || '-'}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Mensagem SSW: <strong style={{ color: '#0f172a' }}>{selectedPedido.sswMensagem || '-'}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Entregue em: <strong style={{ color: '#0f172a' }}>{formatDateTime(selectedPedido.trackingDeliveredAt)}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Recebedor: <strong style={{ color: '#0f172a' }}>{selectedPedido.trackingReceiverName || '-'}</strong></Typography>
                          {selectedPedido.trackingPhotoUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => abrirComprovante(selectedPedido.trackingPhotoUrl)}
                              sx={{ alignSelf: 'flex-start', mt: 1 }}
                            >
                              Abrir comprovante
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    </Paper>
                  </Stack>

                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Historico da entrega</Typography>
                    {selectedPedido.trackingOccurrences.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma ocorrencia de acompanhamento retornada para este pedido.
                      </Typography>
                    ) : (
                      <Stack spacing={1.25}>
                        {selectedPedido.trackingOccurrences.map((occurrence, index) => (
                          <Box
                            key={`${selectedPedido.id}-tracking-${index}`}
                            sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(occurrence.dataHora)}
                              {occurrence.cidade ? ` • ${occurrence.cidade}` : ''}
                              {occurrence.dominio ? ` • ${occurrence.dominio}` : ''}
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>{occurrence.ocorrencia || 'Ocorrencia'}</Typography>
                            {occurrence.descricao && <Typography variant="body2" color="text.secondary">{occurrence.descricao}</Typography>}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedPhotoUrl)}
        onClose={fecharComprovante}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Foto/comprovante da entrega</DialogTitle>
        <DialogContent dividers>
          {selectedPhotoUrl && (
            <Stack spacing={2}>
              <Box
                sx={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                {photoLoading && !photoError && (
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando comprovante...
                    </Typography>
                  </Stack>
                )}

                {photoError && (
                  <Typography variant="body2" color="error" textAlign="center">
                    {photoError}
                  </Typography>
                )}

                <Box
                  component="img"
                  src={selectedPhotoUrl}
                  alt="Foto ou comprovante da entrega"
                  onLoad={() => setPhotoLoading(false)}
                  onError={async () => {
                    setPhotoLoading(false);
                    try {
                      const response = await fetch(selectedPhotoUrl, { cache: 'no-store' });
                      const data = await response.json().catch(() => null);
                      setPhotoError(
                        data?.details ||
                          data?.error ||
                          'Nao foi possivel carregar o comprovante da entrega.'
                      );
                    } catch {
                      setPhotoError('Nao foi possivel carregar o comprovante da entrega.');
                    }
                  }}
                  sx={{
                    display: photoLoading || photoError ? 'none' : 'block',
                    maxWidth: '100%',
                    maxHeight: '72vh',
                    borderRadius: 2,
                    objectFit: 'contain',
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  href={selectedPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir em nova aba
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

(PedidosKanbanPage as any).usesAppLayout = true;
