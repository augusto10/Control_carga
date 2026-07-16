import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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
  numeroNota: string | null;
  identificacaoNfe: string | null;
  controleId: string | null;
  controleDataCriacao: string | null;
  controleTransportadora: string | null;
  sswStatus: string | null;
  sswMensagem: string | null;
  observacaoStatus: string | null;
};

type KanbanResponse = {
  dataReferencia: string;
  dataInicio: string;
  generatedAt: string;
  totals: Record<KanbanStatus, number>;
  columns: Record<KanbanStatus, PedidoKanban[]>;
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

function getTodayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function PedidoCard({ pedido }: { pedido: PedidoKanban }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        backgroundColor: '#fff',
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Pedido #{pedido.pedidoId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pedido.statusLabel}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={formatMoney(pedido.valor)}
            sx={{
              fontWeight: 700,
              backgroundColor: 'rgba(22, 163, 74, 0.12)',
              color: '#166534',
            }}
          />
        </Stack>

        <Box>
          <Typography variant="body2" fontWeight={700}>
            {pedido.clienteNome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cliente #{pedido.clienteId || '-'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <PersonOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Representante: {pedido.vendedorNome}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <ReceiptLongIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            NFe: {pedido.numeroNota || 'sem numero'}
          </Typography>
        </Stack>

        {pedido.identificacaoNfe && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ wordBreak: 'break-all', display: 'block' }}
          >
            Chave NFe: {pedido.identificacaoNfe}
          </Typography>
        )}

        {pedido.controleId && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              backgroundColor: 'rgba(37, 99, 235, 0.06)',
              border: '1px solid rgba(37, 99, 235, 0.12)',
            }}
          >
            <Typography variant="caption" display="block" color="text.secondary">
              Controle vinculado
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {pedido.controleTransportadora || 'Transportadora nao informada'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              {pedido.controleDataCriacao
                ? `Vinculado em ${formatDateTime(pedido.controleDataCriacao)}`
                : 'Carga vinculada na aplicacao'}
            </Typography>
          </Box>
        )}

        {pedido.sswMensagem && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              backgroundColor: 'rgba(234, 88, 12, 0.06)',
              border: '1px solid rgba(234, 88, 12, 0.12)',
            }}
          >
            <Typography variant="caption" display="block" color="text.secondary">
              Mensagem SSW
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {pedido.sswMensagem}
            </Typography>
            {pedido.sswStatus && (
              <Typography variant="caption" display="block" color="text.secondary">
                Status: {pedido.sswStatus}
              </Typography>
            )}
          </Box>
        )}

        {pedido.observacaoStatus && (
          <Typography variant="caption" color="text.secondary">
            {pedido.observacaoStatus}
          </Typography>
        )}

        <Divider />

        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Cadastro: {formatDateTime(pedido.dataHoraCadastro)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Entrega: {formatDateTime(pedido.dataEntrega)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function StatusColumn({ status, pedidos }: { status: KanbanStatus; pedidos: PedidoKanban[] }) {
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

        <Stack spacing={1.5} sx={{ p: 2, minHeight: 520, backgroundColor: '#f8fafc' }}>
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
            pedidos.map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} />)
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
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const [kanbanScrollWidth, setKanbanScrollWidth] = useState(0);

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
                />
              ))}
            </Box>
          </Stack>
        )}
      </Stack>
    </AppLayout>
  );
}

(PedidosKanbanPage as any).usesAppLayout = true;
