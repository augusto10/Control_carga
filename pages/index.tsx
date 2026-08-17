import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  UserCheck,
} from 'lucide-react';

type StatusCode =
  | 'PEDIDO_NOVO'
  | 'PEDIDO_EM_SEPARACAO'
  | 'PEDIDO_SEPARADO'
  | 'AGUARDANDO_CONFERENCIA'
  | 'PRONTO_PARA_EMBARQUE'
  | 'PEDIDO_EMBARCADO';

interface DashboardPedidoItem {
  pedidoId: number;
  clienteNome: string;
  nomeFantasia: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: string | null;
  previsaoEntrega: string | null;
  localNome: string | null;
  statusCodigo: string;
  statusDescricao: string;
  statusSeparacao: string | null;
  usuarioConfirmacaoNome: string | null;
  dataHoraConfirmacao: string | null;
  retirada: {
    foiRetirado: boolean;
    dataHoraRetirada: string | null;
    usuarioRetirada: string | null;
    usuarioRetiradaNome: string | null;
    nomePessoaRecebeu: string | null;
    origem: string | null;
  } | null;
  entregaStatus: {
    codigo: 'EM_PREPARACAO' | 'ENVIADO_TRANSPORTADORA' | 'EM_ROTA_ENTREGA' | 'PEDIDO_ENTREGUE';
    label: string;
    sswStatus: string | null;
    sswMensagem: string | null;
    dataHoraEntrega: string | null;
    recebedor: string | null;
  } | null;
  possuiProdutosFaltando: boolean;
  totalItensPendentes: number;
  produtosPendentes: {
    produtoId: number | null;
    codigo: string | null;
    nome: string;
    quantidade: number;
  }[];
}

interface DashboardStatusItem {
  codigo: StatusCode;
  titulo: string;
  descricao: string;
  statusSeparacao: string;
  total: number;
  pedidos: DashboardPedidoItem[];
}

interface DashboardLogisticaData {
  generatedAt: string;
  filtros: {
    localProduto: string;
    dataInicio?: string | null;
    dataFim: string;
  };
  resumo: {
    totalPedidos: number;
    totalEmbarcados: number;
    totalPendentes: number;
    totalAguardandoConferencia: number;
  };
  indicadores: DashboardStatusItem[];
  warning?: string;
}

interface ResumoHojeData {
  notasHoje: number;
  controlesHoje: number;
  pedidosHoje: number;
  pedidosEntregaHoje: number;
  pedidosRetiraAtoHoje: number;
}

interface PedidoDetalheApiResponse {
  pedido: Record<string, unknown>;
  logistica: {
    pedido?: Record<string, unknown> | null;
    status_logistico?: Record<string, unknown> | null;
    separacoes?: Record<string, unknown>[];
    itens_separacoes?: Record<string, unknown>[];
    entregas?: Record<string, unknown>[];
    notas_fiscais?: Record<string, unknown>[];
  } | null;
}

const STATUS_VISUAL: Record<
  StatusCode,
  {
    icon: typeof Package;
    statColor: 'blue' | 'green' | 'red' | 'indigo' | 'orange' | 'cyan' | 'purple' | 'amber';
    badge: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    accent: string;
    soft: string;
  }
> = {
  PEDIDO_NOVO: {
    icon: Package,
    statColor: 'blue',
    badge: 'info',
    accent: 'text-blue-600',
    soft: 'bg-blue-50 border-blue-100',
  },
  PEDIDO_EM_SEPARACAO: {
    icon: ClipboardList,
    statColor: 'orange',
    badge: 'warning',
    accent: 'text-orange-600',
    soft: 'bg-orange-50 border-orange-100',
  },
  PEDIDO_SEPARADO: {
    icon: PackageCheck,
    statColor: 'green',
    badge: 'success',
    accent: 'text-emerald-600',
    soft: 'bg-emerald-50 border-emerald-100',
  },
  AGUARDANDO_CONFERENCIA: {
    icon: AlertCircle,
    statColor: 'purple',
    badge: 'warning',
    accent: 'text-purple-600',
    soft: 'bg-purple-50 border-purple-100',
  },
  PRONTO_PARA_EMBARQUE: {
    icon: Truck,
    statColor: 'amber',
    badge: 'warning',
    accent: 'text-amber-600',
    soft: 'bg-amber-50 border-amber-100',
  },
  PEDIDO_EMBARCADO: {
    icon: CheckCircle2,
    statColor: 'cyan',
    badge: 'success',
    accent: 'text-cyan-600',
    soft: 'bg-cyan-50 border-cyan-100',
  },
};

const STATUS_ORDER: StatusCode[] = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'AGUARDANDO_CONFERENCIA',
  'PRONTO_PARA_EMBARQUE',
  'PEDIDO_EMBARCADO',
];

const STATUS_DEFAULTS: Record<
  StatusCode,
  Pick<DashboardStatusItem, 'titulo' | 'descricao' | 'statusSeparacao'>
> = {
  PEDIDO_NOVO: {
    titulo: 'Pedidos Novos',
    descricao: 'Status da separacao de pendencias: ABERTO',
    statusSeparacao: 'ABERTO',
  },
  PEDIDO_EM_SEPARACAO: {
    titulo: 'Pedidos em Separacao',
    descricao: 'Status da separacao de pendencias: EM SEPARACAO',
    statusSeparacao: 'EM SEPARACAO',
  },
  PEDIDO_SEPARADO: {
    titulo: 'Pedidos Separados',
    descricao: 'Status da separacao de pendencias: SEPARADO',
    statusSeparacao: 'SEPARADO',
  },
  AGUARDANDO_CONFERENCIA: {
    titulo: 'Aguardando Conferencia',
    descricao: 'Status da separacao de pendencias: SEP., AG. GER. ENT.',
    statusSeparacao: 'SEP., AG. GER. ENT.',
  },
  PRONTO_PARA_EMBARQUE: {
    titulo: 'Prontos para Embarque',
    descricao: 'Status da separacao de pendencias: ENT. GERADA',
    statusSeparacao: 'ENT. GERADA',
  },
  PEDIDO_EMBARCADO: {
    titulo: 'Pedidos Embarcados',
    descricao: 'Usuario de confirmacao com data e hora',
    statusSeparacao: 'EMBARCADO',
  },
};

const EMPTY_RESUMO_HOJE: ResumoHojeData = {
  notasHoje: 0,
  controlesHoje: 0,
  pedidosHoje: 0,
  pedidosEntregaHoje: 0,
  pedidosRetiraAtoHoje: 0,
};
const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatCurrency = (value: number | null) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDateOnlyFromDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatText = (value: unknown, fallback = '-') => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const formatQuantity = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  return '-';
};

const getHoursFromDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
};

const isSameLocalDate = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardLogisticaData | null>(null);
  const [resumoHoje, setResumoHoje] = useState<ResumoHojeData>(EMPTY_RESUMO_HOJE);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [periodoAplicado, setPeriodoAplicado] = useState({ dataInicio: '', dataFim: '' });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<DashboardPedidoItem | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoDetalheApiResponse | null>(null);
  const [loadingPedidoDetalhe, setLoadingPedidoDetalhe] = useState(false);
  const [pedidoDetalheErro, setPedidoDetalheErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const buildPeriodoQuery = (inicio: string, fim: string) => {
    const params = new URLSearchParams();
    if (inicio) params.set('data_inicio', inicio);
    if (fim) params.set('data_fim', fim);
    return params;
  };

  const loadDashboard = useCallback(async (
    forceRefresh = false,
    periodo = periodoAplicado
  ) => {
    if (periodo.dataInicio && periodo.dataFim && periodo.dataInicio > periodo.dataFim) {
      setError('A data inicial nao pode ser maior que a data final.');
      return;
    }

    setLoadingDashboard(true);
    setError(null);

    const params = buildPeriodoQuery(periodo.dataInicio, periodo.dataFim);
    if (forceRefresh) {
      params.set('force', '1');
      params.set('t', String(Date.now()));
    }
    const querySuffix = params.toString() ? `?${params.toString()}` : '';

    const [dashboardResult, resumoHojeResult] = await Promise.allSettled([
      fetch(`/api/dashboard/logistica-inicial${querySuffix}`, {
        credentials: 'include',
        cache: 'no-store',
      }),
      fetch(`/api/dashboard/resumo-hoje${querySuffix}`, {
        credentials: 'include',
        cache: 'no-store',
      }),
    ]);

    let nextError: string | null = null;

    if (dashboardResult.status === 'fulfilled') {
      const response = dashboardResult.value;
      if (response.ok) {
        const data: DashboardLogisticaData = await response.json();
        setDashboard(data);
        if (data.warning) {
          nextError = data.warning;
        }
      } else {
        const data = await response.json().catch(() => null);
        nextError = data?.error || `Falha ao carregar dashboard logistico (${response.status})`;
      }
    } else {
      nextError = 'Nao foi possivel carregar o painel logistico agora.';
    }

    if (resumoHojeResult.status === 'fulfilled') {
      const response = resumoHojeResult.value;
      if (response.ok) {
        const data = await response.json();
        setResumoHoje({
          notasHoje: data.notasHoje || 0,
          controlesHoje: data.controlesHoje || 0,
          pedidosHoje: data.pedidosHoje || 0,
          pedidosEntregaHoje: data.pedidosEntregaHoje || 0,
          pedidosRetiraAtoHoje: data.pedidosRetiraAtoHoje || 0,
        });
      } else if (!nextError) {
        const data = await response.json().catch(() => null);
        nextError = data?.message || `Falha ao carregar resumo do dia (${response.status})`;
      }
    } else if (!nextError) {
      nextError = 'Nao foi possivel carregar o resumo do dia agora.';
      setResumoHoje(EMPTY_RESUMO_HOJE);
    }

    setError(nextError);
    setLoadingDashboard(false);
  }, [periodoAplicado]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadDashboard();

      const refreshDashboard = () => {
        if (document.visibilityState === 'visible') {
          void loadDashboard();
        }
      };
      const refreshDashboardOnFocus = () => {
        if (document.visibilityState === 'visible') {
          void loadDashboard(true);
        }
      };
      const intervalId = window.setInterval(refreshDashboard, DASHBOARD_REFRESH_INTERVAL_MS);
      document.addEventListener('visibilitychange', refreshDashboardOnFocus);

      return () => {
        window.clearInterval(intervalId);
        document.removeEventListener('visibilitychange', refreshDashboardOnFocus);
      };
    }
  }, [isAuthenticated, loadDashboard, periodoAplicado]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const indicadoresOrdenados = useMemo(() => {
    const source = dashboard?.indicadores || [];
    return STATUS_ORDER.map((code) => {
      const existing = source.find((item) => item.codigo === code);
      if (existing) {
        return existing;
      }

      return {
        codigo: code,
        ...STATUS_DEFAULTS[code],
        total: 0,
        pedidos: [],
        produtosPendentes: [],
      };
    });
  }, [dashboard]);

  const aguardandoConferencia = indicadoresOrdenados.find(
    (item) => item.codigo === 'AGUARDANDO_CONFERENCIA'
  );
  const periodoAtivo = useMemo(() => {
    const inicio = formatDateLabel(periodoAplicado.dataInicio);
    const fim = formatDateLabel(periodoAplicado.dataFim);

    if (inicio && fim) return `${inicio} ate ${fim}`;
    if (inicio) return `a partir de ${inicio}`;
    if (fim) return `ate ${fim}`;
    return 'sem filtro de periodo';
  }, [periodoAplicado]);

  const aplicarPeriodo = () => {
    if (dataInicio && dataFim && dataInicio > dataFim) {
      setError('A data inicial nao pode ser maior que a data final.');
      return;
    }

    const proximoPeriodo = { dataInicio, dataFim };
    if (
      proximoPeriodo.dataInicio === periodoAplicado.dataInicio &&
      proximoPeriodo.dataFim === periodoAplicado.dataFim
    ) {
      void loadDashboard(true, proximoPeriodo);
      return;
    }

    setPeriodoAplicado(proximoPeriodo);
  };

  const fecharModalPedido = () => {
    setPedidoSelecionado(null);
    setPedidoDetalhe(null);
    setPedidoDetalheErro(null);
    setLoadingPedidoDetalhe(false);
  };

  const abrirDetalhePedido = useCallback(async (pedido: DashboardPedidoItem) => {
    setPedidoSelecionado(pedido);
    setPedidoDetalhe(null);
    setPedidoDetalheErro(null);
    setLoadingPedidoDetalhe(true);

    try {
      const response = await fetch(`/api/pedidos/${pedido.pedidoId}/logistica`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Falha ao carregar pedido (${response.status})`);
      }

      const data: PedidoDetalheApiResponse = await response.json();
      setPedidoDetalhe(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nao foi possivel carregar os detalhes.';
      setPedidoDetalheErro(message);
    } finally {
      setLoadingPedidoDetalhe(false);
    }
  }, []);

  const pedidoStatusLogistico = pedidoDetalhe?.logistica?.status_logistico || null;
  const pedidoSeparacoes = Array.isArray(pedidoDetalhe?.logistica?.separacoes)
    ? pedidoDetalhe.logistica?.separacoes || []
    : [];
  const pedidoItensSeparacao = Array.isArray(pedidoDetalhe?.logistica?.itens_separacoes)
    ? pedidoDetalhe.logistica?.itens_separacoes || []
    : [];
  const pedidoEntregas = Array.isArray(pedidoDetalhe?.logistica?.entregas)
    ? pedidoDetalhe.logistica?.entregas || []
    : [];
  const pedidoNotasFiscais = Array.isArray(pedidoDetalhe?.logistica?.notas_fiscais)
    ? pedidoDetalhe.logistica?.notas_fiscais || []
    : [];
  const pedidosNaoSeparados = useMemo(
    () =>
      indicadoresOrdenados
        .filter((item) => item.codigo === 'PEDIDO_NOVO' || item.codigo === 'PEDIDO_EM_SEPARACAO')
        .flatMap((item) => item.pedidos),
    [indicadoresOrdenados]
  );
  const alertasCorte = useMemo(() => {
    const agora = new Date();
    const pendentesNoCorte: DashboardPedidoItem[] = [];
    const alertaCritico: DashboardPedidoItem[] = [];

    for (const pedido of pedidosNaoSeparados) {
      const recebimento = pedido.dataHoraRecebimento ? new Date(pedido.dataHoraRecebimento) : null;
      if (!recebimento || Number.isNaN(recebimento.getTime())) continue;

      const horaRecebimento = recebimento.getHours();
      const ficouOutroDia = recebimento < new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const passouDezoitoHoje = isSameLocalDate(recebimento, agora) && agora.getHours() >= 18;

      if (ficouOutroDia || passouDezoitoHoje) {
        alertaCritico.push(pedido);
        continue;
      }

      if (horaRecebimento < 18) {
        pendentesNoCorte.push(pedido);
      }
    }

    pendentesNoCorte.sort((a, b) => {
      const horaA = getHoursFromDate(a.dataHoraRecebimento) ?? 0;
      const horaB = getHoursFromDate(b.dataHoraRecebimento) ?? 0;
      return horaB - horaA;
    });

    alertaCritico.sort((a, b) => {
      const dataA = a.dataHoraRecebimento ? new Date(a.dataHoraRecebimento).getTime() : 0;
      const dataB = b.dataHoraRecebimento ? new Date(b.dataHoraRecebimento).getTime() : 0;
      return dataA - dataB;
    });

    return { pendentesNoCorte, alertaCritico, agora };
  }, [pedidosNaoSeparados]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppLayout
      title={`Ola, ${user?.nome?.split(' ')[0] || 'Usuario'}`}
      subtitle={`${getGreeting()}! Aqui esta o acompanhamento inicial da logistica.`}
    >
      <div className="space-y-8 max-w-[1600px] mx-auto">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 px-6 py-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100/90">
                    Tela Inicial
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Dashboard de Controle de Separacao
                  </h2>
                  <p className="mt-1 text-sm text-blue-100/80">
                    Periodo filtrado pela data de recebimento no caixa: {periodoAtivo}.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                    Data inicial
                  </span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(event) => setDataInicio(event.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-white outline-none backdrop-blur-sm transition placeholder:text-blue-100/50 focus:border-white/50"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                    Data final
                  </span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(event) => setDataFim(event.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-white outline-none backdrop-blur-sm transition placeholder:text-blue-100/50 focus:border-white/50"
                  />
                </label>
                <button
                  onClick={aplicarPeriodo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
                >
                  <CalendarRange className="h-4 w-4" />
                  Aplicar
                </button>
                <button
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setPeriodoAplicado({ dataInicio: '', dataFim: '' });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {indicadoresOrdenados.map((item, index) => {
            const visual = STATUS_VISUAL[item.codigo];
            return (
              <StatCard
                key={item.codigo}
                title={item.titulo}
                value={item.total}
                icon={visual.icon}
                color={visual.statColor}
                trend={item.statusSeparacao}
                loading={loadingDashboard}
                delay={0.05 * (index + 1)}
                size="sm"
              />
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <Card className="border-slate-200 shadow-sm" noPadding>
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Painel por Etapa</h3>
                  <p className="text-sm text-slate-500">
                    Leitura rapida dos pedidos em cada fase da separacao dentro do periodo selecionado.
                  </p>
                </div>
                <button
                  onClick={() => void loadDashboard(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw className={cn('h-4 w-4', loadingDashboard && 'animate-spin')} />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              {indicadoresOrdenados.map((item) => {
                const visual = STATUS_VISUAL[item.codigo];
                return (
                  <motion.div
                    key={item.codigo}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={cn('rounded-2xl border p-4', visual.soft)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <visual.icon className={cn('h-4 w-4', visual.accent)} />
                          <h4 className="text-sm font-bold text-slate-900">{item.titulo}</h4>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">{item.descricao}</p>
                      </div>
                      <Badge variant={visual.badge}>{item.total} pedidos</Badge>
                    </div>

                    <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {item.pedidos.length === 0 ? (
                        <div className="rounded-xl bg-white/80 px-3 py-4 text-sm text-slate-400">
                          Nenhum pedido encontrado nesta etapa.
                        </div>
                      ) : (
                        item.pedidos.map((pedido) => (
                          <button
                            key={`${item.codigo}-${pedido.pedidoId}`}
                            type="button"
                            onClick={() => void abrirDetalhePedido(pedido)}
                            className="w-full rounded-xl bg-white/85 px-3 py-3 text-left shadow-sm transition hover:bg-white hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  Pedido #{pedido.pedidoId}
                                </p>
                                <p className="max-w-[240px] truncate text-xs text-slate-500">
                                  {pedido.nomeFantasia || pedido.clienteNome}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">
                                {pedido.localNome || 'Sem local'}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                              <div>
                                <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                                  Previsao
                                </span>
                                <span className="font-medium text-slate-700">
                                  {formatDateOnlyFromDateTime(pedido.previsaoEntrega)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                                  Valor
                                </span>
                                <span className="font-medium text-slate-700">
                                  {formatCurrency(pedido.valorPedido)}
                                </span>
                              </div>
                            </div>

                            {item.codigo === 'PEDIDO_EMBARCADO' && pedido.retirada?.foiRetirado && (
                              <div className="mt-3 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                                Retirado
                              </div>
                            )}

                            {item.codigo === 'PEDIDO_EMBARCADO' &&
                              !pedido.retirada?.foiRetirado &&
                              pedido.entregaStatus && (
                                <div
                                  className={cn(
                                    'mt-3 inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold',
                                    pedido.entregaStatus.codigo === 'PEDIDO_ENTREGUE'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : pedido.entregaStatus.codigo === 'EM_ROTA_ENTREGA'
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : 'border-blue-200 bg-blue-50 text-blue-700'
                                  )}
                                >
                                  {pedido.entregaStatus.label}
                                </div>
                              )}

                            {pedido.possuiProdutosFaltando && (
                              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-700">
                                {pedido.totalItensPendentes} item(ns) com pendencia para nova separacao.
                                {pedido.produtosPendentes?.length > 0 && (
                                  <div className="mt-2 space-y-1 border-t border-amber-200 pt-2 font-normal">
                                    {pedido.produtosPendentes.map((produto) => (
                                      <div
                                        key={`${pedido.pedidoId}-${produto.produtoId ?? produto.codigo ?? produto.nome}`}
                                        className="flex items-center justify-between gap-3"
                                      >
                                        <span className="truncate">
                                          {produto.codigo ? `${produto.codigo} - ` : ''}{produto.nome}
                                        </span>
                                        <strong className="shrink-0">Qtd. {produto.quantidade}</strong>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {pedido.usuarioConfirmacaoNome && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-cyan-700">
                                <UserCheck className="h-3.5 w-3.5" />
                                {pedido.usuarioConfirmacaoNome} em{' '}
                                {formatDateTime(pedido.dataHoraConfirmacao)}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm" noPadding>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">Resumo Operacional</h3>
                <p className="text-sm text-slate-500">
                  Indicadores rapidos para a tomada de decisao.
                </p>
              </div>
              <div className="grid gap-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Total analisado
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {dashboard?.resumo.totalPedidos || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-700/70">
                      Embarcados
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-cyan-700">
                      {dashboard?.resumo.totalEmbarcados || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-700/70">
                      Pendentes
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-amber-700">
                      {dashboard?.resumo.totalPendentes || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-purple-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-purple-700/70">
                      Aguardando conf.
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-purple-700">
                      {dashboard?.resumo.totalAguardandoConferencia || 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-bold text-slate-900">Movimento do dia</h4>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Pedidos no periodo</span>
                      <span className="font-bold text-slate-900">{resumoHoje.pedidosHoje}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Notas no periodo</span>
                      <span className="font-bold text-slate-900">{resumoHoje.notasHoje}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Controles no periodo</span>
                      <span className="font-bold text-slate-900">{resumoHoje.controlesHoje}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Pedidos de entrega</span>
                      <span className="font-bold text-slate-900">{resumoHoje.pedidosEntregaHoje}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Retira no ato</span>
                      <span className="font-bold text-slate-900">
                        {resumoHoje.pedidosRetiraAtoHoje}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-sm" noPadding>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">Aguardando Conferencia</h3>
                <p className="text-sm text-slate-500">
                  Pedidos com produto faltando e possibilidade de nova separacao.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {aguardandoConferencia?.pedidos?.length ? (
                  aguardandoConferencia.pedidos.map((pedido) => (
                    <div
                      key={`aguardando-${pedido.pedidoId}`}
                      className="rounded-xl border border-purple-100 bg-purple-50/70 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                          <p className="text-xs text-slate-500">
                            {pedido.nomeFantasia || pedido.clienteNome}
                          </p>
                        </div>
                        <Badge variant="warning">{pedido.totalItensPendentes} pend.</Badge>
                      </div>
                      <p className="mt-2 text-xs text-purple-700">
                        Produtos faltando para nova separacao. Local:{' '}
                        <strong>{pedido.localNome || 'nao informado'}</strong>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhum pedido aguardando conferencia no lote consultado.
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-slate-200 shadow-sm" noPadding>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">Corte de Separacao</h3>
                <p className="text-sm text-slate-500">
                  Pedidos ainda nao separados acompanhados pelo horario de corte das 16:00.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {alertasCorte.pendentesNoCorte.length ? (
                  alertasCorte.pendentesNoCorte.map((pedido) => {
                    const horaRecebimento = getHoursFromDate(pedido.dataHoraRecebimento);
                    const antesDoCorte = horaRecebimento !== null && horaRecebimento < 16;

                    return (
                      <button
                        key={`corte-${pedido.pedidoId}`}
                        type="button"
                        onClick={() => void abrirDetalhePedido(pedido)}
                        className={cn(
                          'w-full rounded-xl border px-4 py-3 text-left transition hover:shadow-sm',
                          antesDoCorte
                            ? 'border-amber-200 bg-amber-50/80'
                            : 'border-rose-200 bg-rose-50/80'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                            <p className="text-xs text-slate-500">
                              {pedido.nomeFantasia || pedido.clienteNome}
                            </p>
                          </div>
                          <Badge variant={antesDoCorte ? 'warning' : 'danger'}>
                            {antesDoCorte ? 'Ate 16:00' : 'Apos 16:00'}
                          </Badge>
                        </div>
                        <p
                          className={cn(
                            'mt-2 text-xs',
                            antesDoCorte ? 'text-amber-800' : 'text-rose-800'
                          )}
                        >
                          Recebido no caixa em{' '}
                          <strong>{formatDateTime(pedido.dataHoraRecebimento)}</strong> e ainda nao separado.
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhum pedido pendente dentro da janela de corte no lote consultado.
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-rose-200 shadow-sm" noPadding>
              <div className="border-b border-rose-100 px-6 py-5">
                <h3 className="text-xl font-bold text-rose-900">Alerta Critico</h3>
                <p className="text-sm text-rose-700/80">
                  Pedido nao separado apos 18:00 ou que ficou pendente para o dia seguinte.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {alertasCorte.alertaCritico.length ? (
                  alertasCorte.alertaCritico.map((pedido) => (
                    <button
                      key={`critico-${pedido.pedidoId}`}
                      type="button"
                      onClick={() => void abrirDetalhePedido(pedido)}
                      className="w-full rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-left transition hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                          <p className="text-xs text-slate-500">
                            {pedido.nomeFantasia || pedido.clienteNome}
                          </p>
                        </div>
                        <Badge variant="danger">Critico</Badge>
                      </div>
                      <p className="mt-2 text-xs text-rose-800">
                        Recebido em <strong>{formatDateTime(pedido.dataHoraRecebimento)}</strong> e segue sem separacao.
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhum pedido em alerta critico no lote consultado.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {error && (
          <Card className="border-rose-200 bg-rose-50 text-rose-700">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(pedidoSelecionado)}
        onClose={fecharModalPedido}
        title={pedidoSelecionado ? `Pedido #${pedidoSelecionado.pedidoId}` : 'Detalhes do pedido'}
        size="xl"
      >
        {pedidoSelecionado && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cliente</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {pedidoSelecionado.nomeFantasia || pedidoSelecionado.clienteNome}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {pedidoSelecionado.statusDescricao}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {pedidoSelecionado.statusSeparacao || 'Sem separacao'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Previsao</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatDateOnlyFromDateTime(pedidoSelecionado.previsaoEntrega)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Valor</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatCurrency(pedidoSelecionado.valorPedido)}
                </p>
              </div>
            </div>

            {loadingPedidoDetalhe ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando detalhes do pedido...
              </div>
            ) : pedidoDetalheErro ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {pedidoDetalheErro}
              </div>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-900">Status e horarios</h4>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Codigo logistico</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatText(pedidoStatusLogistico?.codigo, pedidoSelecionado.statusCodigo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Descricao</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatText(pedidoStatusLogistico?.descricao, pedidoSelecionado.statusDescricao)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Responsavel confirmacao</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatText(
                              pedidoStatusLogistico?.usuario_confirmacao_nome,
                              pedidoSelecionado.usuarioConfirmacaoNome || '-'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Horario confirmacao</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {(() => {
                              const horarioConfirmacao =
                                typeof pedidoStatusLogistico?.data_hora_confirmacao === 'string' &&
                                pedidoStatusLogistico.data_hora_confirmacao.trim()
                                  ? pedidoStatusLogistico.data_hora_confirmacao
                                  : pedidoSelecionado.dataHoraConfirmacao;
                              return formatDateTime(horarioConfirmacao);
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Recebido no caixa</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDateTime(formatText(pedidoDetalhe?.pedido?.DATA_HORA_RECEBIMENTO, '') || null)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Local</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {pedidoSelecionado.localNome || 'Sem local informado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-900">Separacoes</h4>
                      </div>
                      {pedidoSeparacoes.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Nenhuma separacao retornada pela API.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {pedidoSeparacoes.map((separacao, index) => (
                            <div
                              key={`separacao-${index}`}
                              className="rounded-xl bg-slate-50 px-4 py-3"
                            >
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Local</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatText(separacao.LOCAL_NOME)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatText(separacao.STATUS_DESCRICAO, formatText(separacao.STATUS))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Separador</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatText(
                                      separacao.USUARIO_NOME,
                                      formatText(separacao.USUARIO_SEPARACAO_NOME)
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Horario</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatDateTime(
                                      typeof separacao.DATA_HORA_ALTERACAO === 'string'
                                        ? separacao.DATA_HORA_ALTERACAO
                                        : typeof separacao.DATA_HORA_SEPARACAO === 'string'
                                          ? separacao.DATA_HORA_SEPARACAO
                                          : null
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-900">Entrega e nota</h4>
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Nota fiscal</span>
                          <strong className="text-slate-900">
                            {formatText(
                              pedidoDetalhe?.pedido?.NUMERO_NOTA,
                              formatText(pedidoNotasFiscais[0]?.NUMERO_NOTA)
                            )}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Chave / identificacao</span>
                          <strong className="max-w-[14rem] truncate text-slate-900">
                            {formatText(
                              pedidoDetalhe?.pedido?.IDENTIFICACAO_NFE,
                              formatText(pedidoNotasFiscais[0]?.IDENTIFICACAO_NFE)
                            )}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Tipo entrega</span>
                          <strong className="text-slate-900">
                            {formatText(pedidoDetalhe?.pedido?.TIPO_ENTREGA)}
                          </strong>
                        </div>
                        {pedidoSelecionado.retirada && (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <span>Retirado</span>
                              <strong className="text-slate-900">
                                {pedidoSelecionado.retirada.foiRetirado ? 'Sim' : 'Nao'}
                              </strong>
                            </div>
                            {pedidoSelecionado.retirada.foiRetirado && (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Data / horario retirada</span>
                                  <strong className="text-slate-900">
                                    {formatDateTime(pedidoSelecionado.retirada.dataHoraRetirada)}
                                  </strong>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Quem retirou</span>
                                  <strong className="text-right text-slate-900">
                                    {pedidoSelecionado.retirada.nomePessoaRecebeu ||
                                      pedidoSelecionado.retirada.usuarioRetiradaNome ||
                                      '-'}
                                  </strong>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Usuario confirmacao</span>
                                  <strong className="text-right text-slate-900">
                                    {pedidoSelecionado.retirada.usuarioRetiradaNome || '-'}
                                  </strong>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <span>Cidade</span>
                          <strong className="text-slate-900">
                            {formatText(pedidoDetalhe?.pedido?.NOME_CIDADE)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Bairro</span>
                          <strong className="text-slate-900">
                            {formatText(pedidoDetalhe?.pedido?.NOME_BAIRRO_NOTA)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>UF / CEP</span>
                          <strong className="text-slate-900">
                            {`${formatText(pedidoDetalhe?.pedido?.ESTADO_DESTINO)} / ${formatText(
                              pedidoDetalhe?.pedido?.CEP
                            )}`}
                          </strong>
                        </div>
                        {pedidoEntregas[0] && (
                          <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600">
                            <strong className="block text-slate-900">Entrega cadastrada</strong>
                            Previsao: {formatDateOnlyFromDateTime(formatText(pedidoEntregas[0].PREVISAO_ENTREGA, '') || null)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-900">Itens de separacao</h4>
                      </div>
                      {pedidoItensSeparacao.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Nenhum item retornado pela API.</p>
                      ) : (
                        <div className="mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                          {pedidoItensSeparacao.slice(0, 30).map((item, index) => (
                            <div
                              key={`item-separacao-${index}`}
                              className="rounded-xl bg-slate-50 px-3 py-3"
                            >
                              <p className="text-sm font-medium text-slate-900">
                                {formatText(item.PRODUTO_NOME, 'Produto nao informado')}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>Cod.: {formatText(item.CODIGO_ORIGINAL, formatText(item.CODIGO_BARRAS))}</span>
                                <span>Qtd.: {formatQuantity(item.QUANTIDADE)}</span>
                                <span>Baixada: {formatQuantity(item.QUANTIDADE_BAIXADA)}</span>
                                <span>Saldo: {formatQuantity(item.SALDO)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {pedidoSelecionado.possuiProdutosFaltando && pedidoSelecionado.produtosPendentes.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <h4 className="text-sm font-bold text-amber-900">Pendencias para nova separacao</h4>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {pedidoSelecionado.produtosPendentes.map((produto) => (
                        <div
                          key={`pendencia-${produto.produtoId ?? produto.codigo ?? produto.nome}`}
                          className="rounded-xl bg-white/70 px-3 py-3 text-sm text-amber-900"
                        >
                          {produto.codigo ? `${produto.codigo} - ` : ''}
                          {produto.nome}
                          <strong className="ml-2">Qtd. {produto.quantidade}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

Home.usesAppLayout = true;

export default Home;
