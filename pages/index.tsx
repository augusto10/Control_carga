import { useCurrentDashboard } from '@/hooks/useCurrentDashboard';
import { resumirPedidosPorStatus } from '@/lib/pedido-resumo-status';
import { PedidoInformacoes } from '@/components/dashboard/PedidoInformacoes';
import { ResumoStatusPedidos } from '@/components/dashboard/ResumoStatusPedidos';
import { saldoPendente, itensComSaldoPendente } from '@/lib/pedido-pendencias';
import { dadosPedido } from '@/lib/pedido-apresentacao';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ExpedicaoCards } from '@/components/dashboard/ExpedicaoCards';
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
  UserCheck,
} from 'lucide-react';

type StatusCode =
  | 'PEDIDO_NOVO'
  | 'PEDIDO_EM_SEPARACAO'
  | 'PEDIDO_SEPARADO'
  | 'PEDIDO_EMBARCADO'
  | 'PEDIDOS_EMBARCADOS'
  | 'PENDENCIAS'
  | 'ALERTAS_NAO_SEPARADOS'
  | 'ALERTAS_NAO_CONFERIDOS'
  | 'ALERTAS_NAO_EMBARCADOS';

interface DashboardPedidoItem {
  statusOperacionalCodigo?: string;
  cidade?: string | null;
  bairro?: string | null;
  uf?: string | null;
  separadorNome?: string | null;
  conferenteNome?: string | null;
  pedidoId: number;
  tipoEntrega?: string | null;
  clienteNome: string;
  nomeFantasia: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: string | null;
  previsaoEntrega: string | null;
  localNome: string | null;
  statusCodigo: string;
  statusDescricao: string;
  statusSeparacao: string | null;
  situacaoAtual?: string;
  usuarioConfirmacaoNome: string | null;
  dataHoraConfirmacao: string | null;
  dataHoraControle: string | null;
  transportadoraNome: string | null;
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
    totalPendencias: number;
  };
  indicadores: DashboardStatusItem[];
  warning?: string;
}

interface ResumoHojeData {
  notasHoje: number;
  controlesHoje: number;
  pedidosHoje: number;
  pedidosEntregaHoje: number;
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
    icon: CheckCircle2,
    statColor: 'green',
    badge: 'success',
    accent: 'text-emerald-600',
    soft: 'bg-emerald-50 border-emerald-100',
  },
  PEDIDO_EMBARCADO: {
    icon: UserCheck,
    statColor: 'cyan',
    badge: 'success',
    accent: 'text-cyan-600',
    soft: 'bg-cyan-50 border-cyan-100',
  },
  PEDIDOS_EMBARCADOS: {
    icon: PackageCheck,
    statColor: 'green',
    badge: 'success',
    accent: 'text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-200',
  },
  PENDENCIAS: {
    icon: AlertCircle,
    statColor: 'purple',
    badge: 'warning',
    accent: 'text-purple-600',
    soft: 'bg-purple-50 border-purple-100',
  },
  ALERTAS_NAO_SEPARADOS: {
    icon: AlertCircle,
    statColor: 'red',
    badge: 'danger',
    accent: 'text-red-600',
    soft: 'bg-red-50 border-red-100',
  },
  ALERTAS_NAO_CONFERIDOS: {
    icon: AlertCircle,
    statColor: 'amber',
    badge: 'warning',
    accent: 'text-amber-600',
    soft: 'bg-amber-50 border-amber-100',
  },
  ALERTAS_NAO_EMBARCADOS: {
    icon: AlertCircle,
    statColor: 'orange',
    badge: 'warning',
    accent: 'text-orange-600',
    soft: 'bg-orange-50 border-orange-100',
  },
};

const STATUS_ORDER: StatusCode[] = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'PEDIDO_EMBARCADO',
  'PEDIDOS_EMBARCADOS',
  'PENDENCIAS',
  'ALERTAS_NAO_SEPARADOS',
  'ALERTAS_NAO_CONFERIDOS',
  'ALERTAS_NAO_EMBARCADOS',
];

const STATUS_DEFAULTS: Record<
  StatusCode,
  Pick<DashboardStatusItem, 'titulo' | 'descricao' | 'statusSeparacao'>
> = {
  PEDIDO_NOVO: {
    titulo: 'PEDIDOS PARA SEPARAÇÃO',
    descricao: 'Status da separacao de pendencias: ABERTO',
    statusSeparacao: 'ABERTO',
  },
  PEDIDO_EM_SEPARACAO: {
    titulo: 'PEDIDOS EM SEPARAÇÃO',
    descricao: 'Status da separacao de pendencias: EM SEPARACAO',
    statusSeparacao: 'EM SEPARACAO',
  },
  PEDIDO_SEPARADO: {
    titulo: 'PEDIDOS SEPARADOS AGUARDANDO CONFERÊNCIA',
    descricao: 'Pedidos com status E aguardando conferência',
    statusSeparacao: 'SEPARADO',
  },
  PEDIDO_EMBARCADO: {
    titulo: 'PEDIDOS CONFERIDOS AGUARDANDO EMBARQUE',
    descricao: 'Usuario de confirmacao com data e hora',
    statusSeparacao: 'EMBARCADO',
  },
  PEDIDOS_EMBARCADOS: {
    titulo: 'PEDIDOS EMBARCADOS',
    descricao: 'Nota fiscal incluida em um controle de cargas',
    statusSeparacao: 'EMBARCADO NO CONTROLE',
  },
  PENDENCIAS: {
    titulo: 'PEDIDOS COM PRODUTOS NÃO ENCONTRADOS',
    descricao: 'Pedidos com pendencias, independentemente do periodo informado',
    statusSeparacao: 'PENDENCIA',
  },
  ALERTAS_NAO_SEPARADOS: {
    titulo: 'PEDIDOS ATRASADOS: NÃO SEPARADOS',
    descricao: 'Pedidos novos e em separação (A e S) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_SEPARADO',
  },
  ALERTAS_NAO_CONFERIDOS: {
    titulo: 'PEDIDOS ATRASADOS: SEPARADOS E NÃO CONFERIDOS',
    descricao: 'Pedidos separados (E) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_CONFERIDO',
  },
  ALERTAS_NAO_EMBARCADOS: {
    titulo: 'PEDIDOS ATRASADOS: CONFERIDOS E NÃO EMBARCADOS',
    descricao: 'Pedidos conferidos (G) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_EMBARCADO',
  },
};

const EMPTY_RESUMO_HOJE: ResumoHojeData = {
  notasHoje: 0,
  controlesHoje: 0,
  pedidosHoje: 0,
  pedidosEntregaHoje: 0,
};
const DASHBOARD_LOCAL_CACHE_KEY = 'dashboard-logistica-cache-v11';
const DASHBOARD_ALERTAS_LOCAL_CACHE_KEY = 'dashboard-logistica-alertas-cache-v5';
const DASHBOARD_AUTO_REFRESH_INTERVAL_MS = 3 * 60_000;
const DASHBOARD_LEGACY_CACHE_KEYS = [
  'dashboard-logistica-cache-v3',
  'dashboard-logistica-cache-v4',
  'dashboard-logistica-cache-v5',
  'dashboard-logistica-cache-v6',
  'dashboard-logistica-cache-v7',
];

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

const formatTimeOnlyFromDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
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

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultPeriodo = () => {
  const dataFim = new Date();

  return {
    dataInicio: formatDateInputValue(dataFim),
    dataFim: formatDateInputValue(dataFim),
  };
};

const getAlertasPeriodo = () => {
  const dataFim = new Date();
  const dataInicio = new Date(dataFim);
  dataInicio.setDate(dataInicio.getDate() - 29);

  return {
    dataInicio: formatDateInputValue(dataInicio),
    dataFim: formatDateInputValue(dataFim),
  };
};

const buildIndicadoresOrdenados = (dashboard: DashboardLogisticaData | null) => {
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
};

const isDashboardFallbackVazio = (dashboard: DashboardLogisticaData) =>
  Boolean(dashboard.warning) && (dashboard.resumo?.totalPedidos || 0) === 0;

const isTransientDashboardError = (message: string | null) =>
  message !== null && (
    message.includes('API externa indisponivel') ||
    message.includes('Nao foi possivel carregar o painel logistico agora') ||
    message.includes('Nao foi possivel carregar alertas e pendencias agora') ||
    message.includes('Nao foi possivel carregar o resumo do dia agora')
  );

function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [periodoPadrao] = useState(getDefaultPeriodo);
  const [dashboard, setDashboard] = useCurrentDashboard<DashboardLogisticaData | null>(null, DASHBOARD_LOCAL_CACHE_KEY);
  const [dashboardAlertas, setDashboardAlertas] = useCurrentDashboard<DashboardLogisticaData | null>(null, DASHBOARD_ALERTAS_LOCAL_CACHE_KEY);
  const [resumoHoje, setResumoHoje] = useState<ResumoHojeData>(EMPTY_RESUMO_HOJE);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [acaoFiltroAtiva, setAcaoFiltroAtiva] = useState<'apply' | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState(periodoPadrao.dataInicio);
  const [dataFim, setDataFim] = useState(periodoPadrao.dataFim);
  const [periodoAplicado, setPeriodoAplicado] = useState(periodoPadrao);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<DashboardPedidoItem | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoDetalheApiResponse | null>(null);
  const [loadingPedidoDetalhe, setLoadingPedidoDetalhe] = useState(false);
  const [pedidoDetalheErro, setPedidoDetalheErro] = useState<string | null>(null);
  const [listaPedidos, setListaPedidos] = useState<{
    codigo?: string;
    titulo: string;
    descricao: string;
    pedidos: DashboardPedidoItem[];
  } | null>(null);
  const pedidoDetalheCacheRef = useRef<Record<number, PedidoDetalheApiResponse>>({});
  const pedidoDetalheRequestRef = useRef<Record<number, Promise<PedidoDetalheApiResponse> | undefined>>({});
  const pedidoSelecionadoRef = useRef<number | null>(null);
  const dashboardRef = useRef<DashboardLogisticaData | null>(null);
  const acaoFiltroPendenteRef = useRef<'apply' | 'clear' | null>(null);
  const lastDashboardSyncRef = useRef(0);

  useEffect(() => {
    dashboardRef.current = dashboard;
  }, [dashboard]);

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

  const dashboardRequestId = useRef(0);
  useEffect(() => () => { dashboardRequestId.current += 1; }, []);

  const loadDashboard = useCallback(async (
    forceRefresh = false,
    periodo = periodoAplicado,
    acaoFiltro?: 'apply' | 'clear' | null
  ) => {
    const requestId = ++dashboardRequestId.current;
    if (periodo.dataInicio && periodo.dataFim && periodo.dataInicio > periodo.dataFim) {
      setError('A data inicial nao pode ser maior que a data final.');
      return;
    }

    if (acaoFiltro) {
      setAcaoFiltroAtiva(acaoFiltro);
    }

    const hasVisibleData = Boolean(dashboardRef.current);
    if (hasVisibleData) {
      setRefreshingDashboard(true);
    } else {
      setLoadingDashboard(true);
    }
    setError(null);

    const params = buildPeriodoQuery(periodo.dataInicio, periodo.dataFim);
    params.set('escopo', 'principal');
    const alertasPeriodo = getAlertasPeriodo();
    const alertasParams = buildPeriodoQuery(alertasPeriodo.dataInicio, alertasPeriodo.dataFim);
    if (forceRefresh) {
      params.set('force', '1');
      params.set('t', String(Date.now()));
      alertasParams.set('force', '1');
      alertasParams.set('t', String(Date.now()));
    }
    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const alertasQuerySuffix = alertasParams.toString() ? `?${alertasParams.toString()}` : '';

    let nextError: string | null = null;

    // Renderiza o painel principal assim que a consulta do periodo terminar.
    const dashboardResult = await Promise.allSettled([
      fetch(`/api/dashboard/logistica-inicial${querySuffix}`, {
        credentials: 'include',
        cache: 'no-store',
      }),
    ]);
    if (requestId !== dashboardRequestId.current) return;
    const dashboardResponse = dashboardResult[0];
    if (dashboardResponse.status === 'fulfilled') {
      const response = dashboardResponse.value;
      if (response.ok) {
        const data: DashboardLogisticaData = await response.json();
        if (requestId !== dashboardRequestId.current) return;
        if (isDashboardFallbackVazio(data)) {
          nextError = data.warning || 'Nao foi possivel atualizar o painel logistico agora.';
        } else {
          setDashboard(data);
        }
      } else {
        const data = await response.json().catch(() => null);
        if (requestId !== dashboardRequestId.current) return;
        nextError = data?.error || `Falha ao carregar dashboard logistico (${response.status})`;
      }
    } else {
      nextError = 'Nao foi possivel carregar o painel logistico agora.';
    }

    setLoadingDashboard(false);

    // Alertas e resumo sao secundarios e nao bloqueiam a primeira pintura.
    const [dashboardAlertasResult, resumoHojeResult] = await Promise.allSettled([
      fetch(`/api/dashboard/logistica-inicial${alertasQuerySuffix}`, {
        credentials: 'include',
        cache: 'no-store',
      }),
      fetch(`/api/dashboard/resumo-hoje${querySuffix}`, {
        credentials: 'include',
        cache: 'no-store',
      }),
    ]);

    if (requestId !== dashboardRequestId.current) return;
    if (dashboardAlertasResult.status === 'fulfilled') {
      const response = dashboardAlertasResult.value;
      if (response.ok) {
        const data: DashboardLogisticaData = await response.json();
        if (requestId !== dashboardRequestId.current) return;
        if (isDashboardFallbackVazio(data)) {
          if (!nextError) nextError = data.warning || 'Nao foi possivel atualizar alertas e pendencias agora.';
        } else {
          setDashboardAlertas(data);
        }
      } else if (!nextError) {
        const data = await response.json().catch(() => null);
        if (requestId !== dashboardRequestId.current) return;
        nextError = data?.error || `Falha ao carregar alertas e pendencias (${response.status})`;
      }
    } else if (!nextError) {
      nextError = 'Nao foi possivel carregar alertas e pendencias agora.';
    }

    if (resumoHojeResult.status === 'fulfilled') {
      const response = resumoHojeResult.value;
      if (response.ok) {
        const data = await response.json();
        if (requestId !== dashboardRequestId.current) return;
        setResumoHoje({
          notasHoje: data.notasHoje || 0,
          controlesHoje: data.controlesHoje || 0,
          pedidosHoje: data.pedidosHoje || 0,
          pedidosEntregaHoje: data.pedidosEntregaHoje || 0,
        });
      } else if (!nextError) {
        const data = await response.json().catch(() => null);
        if (requestId !== dashboardRequestId.current) return;
        nextError = data?.message || `Falha ao carregar resumo do dia (${response.status})`;
      }
    } else if (!nextError) {
      nextError = 'Nao foi possivel carregar o resumo do dia agora.';
      if (!hasVisibleData) {
        setResumoHoje(EMPTY_RESUMO_HOJE);
      }
    }

    if (requestId !== dashboardRequestId.current) return;
    setError(isTransientDashboardError(nextError) ? null : nextError);
    setLoadingDashboard(false);
    setRefreshingDashboard(false);
    setAcaoFiltroAtiva(null);
    lastDashboardSyncRef.current = Date.now();
  }, [periodoAplicado]);

  useEffect(() => {
    if (isAuthenticated) {
      try {
        const cached = JSON.parse(window.localStorage.getItem(DASHBOARD_LOCAL_CACHE_KEY) || 'null') as DashboardLogisticaData | null;
        if (cached && cached.filtros?.dataInicio === periodoAplicado.dataInicio && cached.filtros?.dataFim === periodoAplicado.dataFim && Array.isArray(cached.indicadores)) {
          setDashboard(cached);
          setLoadingDashboard(false);
        }
        const cachedAlertas = JSON.parse(window.localStorage.getItem(DASHBOARD_ALERTAS_LOCAL_CACHE_KEY) || 'null') as DashboardLogisticaData | null;
        const periodoAlertas = getAlertasPeriodo();
        if (cachedAlertas && cachedAlertas.filtros?.dataInicio === periodoAlertas.dataInicio && cachedAlertas.filtros?.dataFim === periodoAlertas.dataFim && Array.isArray(cachedAlertas.indicadores)) {
          setDashboardAlertas(cachedAlertas);
        }
      } catch { /* Cache corrompido é ignorado; a API atual será consultada. */ }
      const acaoFiltro = acaoFiltroPendenteRef.current;
      acaoFiltroPendenteRef.current = null;
      void loadDashboard(false, periodoAplicado, acaoFiltro);
    }
  }, [isAuthenticated, loadDashboard, periodoAplicado]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInBackground = () => {
      void loadDashboard(false, periodoAplicado);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastDashboardSyncRef.current < DASHBOARD_AUTO_REFRESH_INTERVAL_MS) return;
      void loadDashboard(false, periodoAplicado);
    };

    const intervalId = window.setInterval(refreshInBackground, DASHBOARD_AUTO_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, loadDashboard, periodoAplicado]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const indicadoresOrdenados = useMemo(() => buildIndicadoresOrdenados(dashboard), [dashboard]);
  const indicadoresAlertasOrdenados = useMemo(
    () => buildIndicadoresOrdenados(dashboardAlertas),
    [dashboardAlertas]
  );

  const resumoStatus = useMemo(() => [
    ...indicadoresOrdenados.filter((item) => !item.codigo.startsWith('ALERTAS_') && item.codigo !== 'PENDENCIAS'),
    ...indicadoresAlertasOrdenados.filter((item) => item.codigo.startsWith('ALERTAS_') || item.codigo === 'PENDENCIAS'),
  ], [indicadoresOrdenados, indicadoresAlertasOrdenados]);

  const pendencias = indicadoresAlertasOrdenados.find(
    (item) => item.codigo === 'PENDENCIAS'
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
      void loadDashboard(true, proximoPeriodo, 'apply');
      return;
    }

    acaoFiltroPendenteRef.current = 'apply';
    setPeriodoAplicado(proximoPeriodo);
  };

  const limparPeriodo = () => {
    const proximoPeriodo = {
      dataInicio: periodoPadrao.dataInicio,
      dataFim: periodoPadrao.dataFim,
    };

    setDataInicio(proximoPeriodo.dataInicio);
    setDataFim(proximoPeriodo.dataFim);

    if (
      proximoPeriodo.dataInicio === periodoAplicado.dataInicio &&
      proximoPeriodo.dataFim === periodoAplicado.dataFim
    ) {
      void loadDashboard(true, proximoPeriodo, 'clear');
      return;
    }

    acaoFiltroPendenteRef.current = 'clear';
    setPeriodoAplicado(proximoPeriodo);
  };

  const fecharModalPedido = () => {
    pedidoSelecionadoRef.current = null;
    setPedidoSelecionado(null);
    setPedidoDetalhe(null);
    setPedidoDetalheErro(null);
    setLoadingPedidoDetalhe(false);
  };

  const abrirListaPedidos = (item: DashboardStatusItem) => {
    setListaPedidos({
      codigo: item.codigo,
      titulo: item.titulo,
      descricao: item.descricao,
      pedidos: item.pedidos,
    });
  };

  const fecharListaPedidos = () => {
    setListaPedidos(null);
  };

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

  useEffect(() => {
    const pedidosSemProdutos = (pendencias?.pedidos || []).filter(
      (pedido) => pedido.produtosPendentes.length === 0
    );
    if (pedidosSemProdutos.length === 0) return;

    let ativo = true;
    void Promise.all(pedidosSemProdutos.map(async (pedido) => {
      try {
        const detalhe = await fetchPedidoDetalhe(pedido.pedidoId);
        const itens = itensComSaldoPendente(detalhe.logistica);
        if (itens === null) return null;

        const produtos = new Map<string, DashboardPedidoItem['produtosPendentes'][number]>();
        itens.forEach((item) => {
          const quantidade = saldoPendente(item);
          if (quantidade <= 0) return;
          const produtoId = Number(item.PRODUTO_ID ?? item.produto_id);
          const codigo = formatText(item.CODIGO_ORIGINAL, formatText(item.CODIGO_BARRAS, '')) || null;
          const nome = formatText(item.PRODUTO_NOME, 'Produto não informado');
          const chave = String(Number.isFinite(produtoId) ? produtoId : codigo || nome);
          const existente = produtos.get(chave);
          if (existente) existente.quantidade += quantidade;
          else produtos.set(chave, {
            produtoId: Number.isFinite(produtoId) ? produtoId : null,
            codigo,
            nome,
            quantidade,
          });
        });
        return { pedidoId: pedido.pedidoId, produtos: Array.from(produtos.values()) };
      } catch {
        return null;
      }
    })).then((confirmacoes) => {
      if (!ativo || confirmacoes.every((item) => item === null)) return;
      const porPedido = new Map(confirmacoes.filter(Boolean).map((item) => [item!.pedidoId, item!.produtos]));
      setDashboardAlertas((atual) => {
        if (!atual || atual !== dashboardAlertas) return atual;
        return {
          ...atual,
          indicadores: atual.indicadores.map((indicador) => {
            if (indicador.codigo !== 'PENDENCIAS') return indicador;
            const pedidosConfirmados = indicador.pedidos
              .filter((pedido) => !porPedido.has(pedido.pedidoId) || porPedido.get(pedido.pedidoId)!.length > 0)
              .map((pedido) => {
                const produtos = porPedido.get(pedido.pedidoId);
                return produtos ? {
                  ...pedido,
                  possuiProdutosFaltando: true,
                  produtosPendentes: produtos,
                  totalItensPendentes: produtos.reduce((total, produto) => total + produto.quantidade, 0),
                } : pedido;
              });
            return { ...indicador, pedidos: pedidosConfirmados, total: pedidosConfirmados.length };
          }),
        };
      });
    });

    return () => { ativo = false; };
  }, [fetchPedidoDetalhe, pendencias, dashboardAlertas]);

  const abrirDetalhePedido = useCallback(async (pedido: DashboardPedidoItem) => {
    pedidoSelecionadoRef.current = pedido.pedidoId;
    setPedidoSelecionado(pedido);
    setPedidoDetalheErro(null);
    setListaPedidos(null);

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
        const message = err instanceof Error ? err.message : 'Nao foi possivel carregar os detalhes.';
        setPedidoDetalheErro(message);
      }
    } finally {
      if (pedidoSelecionadoRef.current === pedido.pedidoId) {
        setLoadingPedidoDetalhe(false);
      }
    }
  }, [fetchPedidoDetalhe]);

  const pedidoStatusLogistico = pedidoDetalhe?.logistica?.status_logistico || null;
  const pedidoSeparacoes = Array.isArray(pedidoDetalhe?.logistica?.separacoes)
    ? pedidoDetalhe.logistica?.separacoes || []
    : [];
  const pedidoItensSeparacao = useMemo(
    () => Array.isArray(pedidoDetalhe?.logistica?.itens_separacoes)
      ? pedidoDetalhe.logistica?.itens_separacoes || []
      : [],
    [pedidoDetalhe]
  );
  const itensPendentesModal = useMemo(() => {
    if (!pedidoSelecionado?.possuiProdutosFaltando) return [];
    const itensDetalhados = itensComSaldoPendente(pedidoDetalhe?.logistica || null);
    if (itensDetalhados === null) return pedidoSelecionado.produtosPendentes;

    return itensDetalhados
      .map((item) => {
        const saldo = saldoPendente(item);

        return {
          produtoId: typeof item.PRODUTO_ID === 'number' ? item.PRODUTO_ID : null,
          codigo: formatText(item.CODIGO_ORIGINAL, formatText(item.CODIGO_BARRAS, '')),
          nome: formatText(item.PRODUTO_NOME, 'Produto nao informado'),
          quantidade: saldo,
        };
      })
      .filter((produto) => produto.quantidade > 0);
  }, [pedidoDetalhe, pedidoSelecionado]);
  const pedidoEntregas = Array.isArray(pedidoDetalhe?.logistica?.entregas)
    ? pedidoDetalhe.logistica?.entregas || []
    : [];
  const pedidoNotasFiscais = Array.isArray(pedidoDetalhe?.logistica?.notas_fiscais)
    ? pedidoDetalhe.logistica?.notas_fiscais || []
    : [];
  const alertasNaoSeparados = useMemo(
    () => indicadoresAlertasOrdenados.find((item) => item.codigo === 'ALERTAS_NAO_SEPARADOS')?.pedidos || [],
    [indicadoresAlertasOrdenados]
  );
  const alertasNaoConferidos = useMemo(
    () => indicadoresAlertasOrdenados.find((item) => item.codigo === 'ALERTAS_NAO_CONFERIDOS')?.pedidos || [],
    [indicadoresAlertasOrdenados]
  );
  const alertasNaoEmbarcados = useMemo(
    () => indicadoresAlertasOrdenados.find((item) => item.codigo === 'ALERTAS_NAO_EMBARCADOS')?.pedidos || [],
    [indicadoresAlertasOrdenados]
  );
  const cardsHome = useMemo(() => ([
    {
      id: 'PEDIDO_NOVO_CARD',
      codigo: 'PEDIDO_NOVO' as StatusCode,
      titulo: 'PEDIDOS NOVOS',
      descricao: 'Pedidos recebidos e prontos para iniciar a separacao.',
      color: 'from-[#3d8df0] via-[#2472d8] to-[#1b5cb6]',
      icon: Package,
      iconClassName: 'text-[#2472d8]',
    },
    {
      id: 'PEDIDO_EM_SEPARACAO_CARD',
      codigo: 'PEDIDO_EM_SEPARACAO' as StatusCode,
      titulo: 'PEDIDOS EM SEPARAÇÃO',
      descricao: 'Pedidos em andamento no processo de separação.',
      color: 'from-[#ffcf35] via-[#ffbf18] to-[#f4a300]',
      icon: ClipboardList,
      iconClassName: 'text-[#f2a900]',
    },
    {
      id: 'PEDIDO_SEPARADO_CARD',
      codigo: 'PEDIDO_SEPARADO' as StatusCode,
      titulo: 'PEDIDOS SEPARADOS AGUARDANDO CONFERÊNCIA',
      descricao: 'Pedidos separados e aguardando conferência.',
      color: 'from-[#67c857] via-[#47b44b] to-[#2d9640]',
      icon: PackageCheck,
      iconClassName: 'text-[#39a64a]',
    },
    {
      id: 'PEDIDO_EMBARCADO_CARD',
      codigo: 'PEDIDO_EMBARCADO' as StatusCode,
      titulo: 'PEDIDOS CONFERIDOS',
      descricao: 'Pedidos conferidos e aguardando embarque no controle.',
      color: 'from-[#ffcf35] via-[#ffbf18] to-[#f4a300]',
      icon: UserCheck,
      iconClassName: 'text-[#f2a900]',
    },
    {
      id: 'PEDIDOS_EMBARCADOS_CARD',
      codigo: 'PEDIDOS_EMBARCADOS' as StatusCode,
      titulo: 'PEDIDOS EMBARCADOS',
      descricao: 'Pedidos ja vinculados a um controle de carga.',
      color: 'from-[#43c962] via-[#29b551] to-[#229043]',
      icon: PackageCheck,
      iconClassName: 'text-[#29b551]',
    },
  ]), []);
  const totaisAlertas = useMemo(
    () => ({
      naoSeparado: alertasNaoSeparados.length,
      naoConferido: alertasNaoConferidos.length,
      naoEmbarcado: alertasNaoEmbarcados.length,
    }),
    [alertasNaoConferidos.length, alertasNaoEmbarcados.length, alertasNaoSeparados.length]
  );
  const pedidosAlertasCombinados = useMemo(
    () => Array.from(new Map(
      [...alertasNaoSeparados, ...alertasNaoConferidos, ...alertasNaoEmbarcados]
        .map((pedido) => [pedido.pedidoId, pedido] as const)
    ).values()),
    [alertasNaoConferidos, alertasNaoEmbarcados, alertasNaoSeparados]
  );
  const dataHojeLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(new Date()), []);
  const ultimaAtualizacao = dashboardAlertas?.generatedAt || dashboard?.generatedAt || null;

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
      title={`CONTROLE DE PEDIDOS - ${dataHojeLabel}`}
      subtitle={`CONTROLE DE PEDIDOS - ${dataHojeLabel}`}
      showHeader={false}
    >
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="space-y-4">
          <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-lg shadow-slate-900/10">
            <div className="relative overflow-hidden px-4 py-2 sm:px-5 sm:py-2.5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.24),_transparent_34%)]" />
              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <div className="hidden">
                  <p className="text-sm font-semibold text-blue-100/90">
                    Etapas principais no dia atual. Atrasados e produtos não encontrados consideram os últimos 30 dias.
                  </p>
                  <p className="mt-1 text-xs text-blue-100/75 sm:text-sm">
                    Período filtrado pela data de recebimento no caixa: {periodoAtivo}.
                  </p>
                </div>
                <h1 className="text-base font-black tracking-[0.08em] text-white sm:text-lg">
                  CONTROLE DE PEDIDOS - {dataHojeLabel}
                </h1>

                <div className="flex flex-col items-end gap-1 [&>label]:hidden [&>button:nth-of-type(1)]:hidden [&>button:nth-of-type(2)]:hidden">
                  <label className="space-y-1 text-sm">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">
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
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">
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
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                      acaoFiltroAtiva === 'apply'
                        ? 'bg-blue-100 text-blue-900 ring-2 ring-white/60'
                        : 'bg-white text-slate-900 hover:bg-blue-50'
                    )}
                  >
                    {acaoFiltroAtiva === 'apply' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarRange className="h-4 w-4" />
                    )}
                    Aplicar
                  </button>
                  <button
                    onClick={limparPeriodo}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                      acaoFiltroAtiva === 'clear'
                        ? 'border-white/50 bg-white/25 text-white ring-2 ring-white/40'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                    )}
                  >
                    {acaoFiltroAtiva === 'clear' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadDashboard(true)}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                      refreshingDashboard
                        ? 'border-white/50 bg-white/25 text-white ring-2 ring-white/40'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                    )}
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshingDashboard && 'animate-spin')} />
                    Atualizar
                  </button>
                  <p className="text-right text-[11px] font-medium text-blue-100/75">
                    Dados atualizados em {formatDateTime(ultimaAtualizacao)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <ExpedicaoCards
            loadingStages={loadingDashboard && !dashboard}
            loadingSecondary={!dashboardAlertas}
            stageCards={cardsHome.map((card) => {
              const item = indicadoresOrdenados.find((indicador) => indicador.codigo === card.codigo);
              const visual = STATUS_VISUAL[card.codigo];

            return {
                key: card.id,
                titulo: card.titulo,
                total: item?.total || 0,
                icon: card.icon || visual.icon,
                iconClassName: card.iconClassName,
                colorClass: card.color,
                onClick: () => item && abrirListaPedidos(item),
              };
            })}
            alertas={{
              naoSeparado: totaisAlertas.naoSeparado,
              naoConferido: totaisAlertas.naoConferido,
              naoEmbarcado: totaisAlertas.naoEmbarcado,
              total: pedidosAlertasCombinados.length,
              onClick: () =>
                abrirListaPedidos({
                  codigo: 'ALERTAS_NAO_SEPARADOS',
                  titulo: 'PEDIDOS ATRASADOS',
                  descricao: '',
                  statusSeparacao: 'ALERTAS',
                  total: pedidosAlertasCombinados.length,
                  pedidos: pedidosAlertasCombinados,
                }),
            }}
            pendencias={{
              total: pendencias?.total || 0,
              pedidos: pendencias?.pedidos || [],
              onClick: () =>
                pendencias &&
                abrirListaPedidos({
                  ...pendencias,
                  titulo: 'PEDIDOS COM PRODUTOS NÃO ENCONTRADOS',
                  descricao: 'Pedidos com itens pendentes nos últimos 30 dias.',
                }),
            }}
          />
        </div>

        <div className="hidden">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 px-6 py-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <Package className="h-6 w-6" />
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

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
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
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    acaoFiltroAtiva === 'apply'
                      ? 'bg-blue-100 text-blue-900 ring-2 ring-white/60'
                      : 'bg-white text-slate-900 hover:bg-blue-50'
                  )}
                >
                  {acaoFiltroAtiva === 'apply' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarRange className="h-4 w-4" />
                  )}
                  Aplicar
                </button>
                <button
                  onClick={limparPeriodo}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                    acaoFiltroAtiva === 'clear'
                      ? 'border-white/50 bg-white/25 text-white ring-2 ring-white/40'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                  )}
                >
                  {acaoFiltroAtiva === 'clear' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Resumo Operacional - Indicadores rápidos para tomada de decisão - OCULTADO TEMPORARIAMENTE
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-4">
            <h3 className="text-lg font-bold text-white">Resumo Operacional</h3>
            <p className="text-xs text-blue-100/80 mt-0.5">Indicadores rápidos para a tomada de decisões</p>
          </div>
          <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 lg:grid-cols-7 p-4">
            <StatCard
              title="Total analisado"
              value={dashboard?.resumo?.totalPedidos || 0}
              icon={Package}
              color="blue"
              size="xs"
            />
            <StatCard
              title="Embarcados"
              value={dashboard?.resumo?.totalEmbarcados || 0}
              icon={UserCheck}
              color="cyan"
              size="xs"
            />
            <StatCard
              title="Pendentes"
              value={dashboard?.resumo?.totalPendentes || 0}
              icon={ClipboardList}
              color="orange"
              size="xs"
            />
            <StatCard
              title="Produtos não encontrados"
              value={dashboard?.resumo?.totalPendencias || 0}
              icon={AlertCircle}
              color="purple"
              size="xs"
            />
            <StatCard
              title="Movimento do dia"
              value={dashboard?.resumo?.totalPedidos || 0}
              icon={Package}
              color="blue"
              size="xs"
            />
            <StatCard
              title="Notas no período"
              value={indicadoresOrdenados.find((i) => i.codigo === 'PEDIDO_EMBARCADO')?.pedidos?.length || 0}
              icon={Package}
              color="indigo"
              size="xs"
            />
            <StatCard
              title="Controles no período"
              value={indicadoresOrdenados.reduce((acc, i) => acc + (i.pedidos?.length || 0), 0) > 0 ? 2 : 0}
              icon={ClipboardList}
              color="amber"
              size="xs"
            />
          </div>
        </Card>
        */}

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {indicadoresOrdenados.map((item, index) => {
            const visual = STATUS_VISUAL[item.codigo];
            return (
              <button
                key={item.codigo}
                type="button"
                onClick={() => abrirListaPedidos(item)}
                className="min-w-0 text-left transition hover:opacity-90"
              >
                <StatCard
                  title={item.titulo}
                  value={item.total}
                  icon={visual.icon}
                  color={visual.statColor}
                  trend={item.statusSeparacao}
                  loading={loadingDashboard && !dashboard}
                  delay={0.05 * (index + 1)}
                  size="xs"
                />
              </button>
            );
          })}
        </div>

        <div>
          <Card className="border-slate-200 shadow-sm" noPadding>
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Acompanhamento de Pedidos</h3>
                  <p className="text-sm text-slate-500">
                    Leitura rapida dos pedidos em cada fase da separacao dentro do periodo selecionado.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
              {indicadoresOrdenados.map((item) => {
                const visual = STATUS_VISUAL[item.codigo];
                return (
                  <motion.div
                    key={item.codigo}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={cn('rounded-xl border p-3', visual.soft)}
                  >
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <visual.icon className={cn('h-3.5 w-3.5 shrink-0', visual.accent)} />
                          <h4 className="text-xs font-bold uppercase leading-4 text-slate-900">{item.titulo}</h4>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-4 text-slate-500">{item.descricao}</p>
                      </div>
                      <Badge variant={visual.badge}>{item.total} pedidos</Badge>
                    </div>

                    <div className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                      {item.pedidos.length === 0 ? (
                        <div className="rounded-lg bg-white/80 px-2.5 py-3 text-xs text-slate-400">
                          Nenhum pedido encontrado nesta etapa.
                        </div>
                      ) : (
                        item.pedidos.map((pedido) => (
                          <button
                            key={`${item.codigo}-${pedido.pedidoId}`}
                            type="button"
                            onClick={() => void abrirDetalhePedido(pedido)}
                            className="w-full rounded-lg bg-white/85 px-2.5 py-2.5 text-left shadow-sm transition hover:bg-white hover:shadow-md"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-lg font-bold text-slate-900">
                                  Pedido #{pedido.pedidoId}
                                </p>

                              </div>
                              <p className="truncate text-[11px] text-slate-500">
                                {pedido.nomeFantasia || pedido.clienteNome}
                              </p>
                              {(pedido.transportadoraNome || pedido.dataHoraControle) && (
                                <div className="mt-1 space-y-0.5 text-[10px] text-emerald-700">
                                  {pedido.transportadoraNome && (
                                    <p className="truncate font-medium">
                                      Transportadora: {pedido.transportadoraNome}
                                    </p>
                                  )}
                                  {pedido.dataHoraControle && (
                                    <p>Vinculado em {formatDateTime(pedido.dataHoraControle)}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            <p className="mt-2 text-[11px] text-slate-500">Recebimento: <strong>{formatDateTime(pedido.dataHoraRecebimento)}</strong></p>
                            <PedidoInformacoes pedido={pedido} carregarDetalhe={fetchPedidoDetalhe} />
                            <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                              Ver detalhes <ClipboardList className="h-3.5 w-3.5" />
                            </div>

                            {item.codigo === 'PENDENCIAS' && pedido.possuiProdutosFaltando && (
                              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700">
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
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-700">
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

          <div className="hidden">
            {/* Resumo Operacional (segunda versão) - OCULTADO TEMPORARIAMENTE
            <Card className="border-slate-200 shadow-sm" noPadding>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">Resumo Operacional</h3>
                <p className="text-sm text-slate-500">
                  Indicadores rapidos para a tomada de decisao.
                </p>
              </div>
              <div className="grid gap-4 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Total analisado
                    </p>
                    <p className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
                      {dashboard?.resumo.totalPedidos || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-700/70">
                      Embarcados
                    </p>
                    <p className="mt-2 text-xl sm:text-2xl font-extrabold text-cyan-700">
                      {dashboard?.resumo.totalEmbarcados || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-700/70">
                      Pendentes
                    </p>
                    <p className="mt-2 text-xl sm:text-2xl font-extrabold text-amber-700">
                      {dashboard?.resumo.totalPendentes || 0}
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
                  </div>
                </div>
              </div>
            </Card>
            */}

            {/* ALERTAS: NÃO SEPARADOS - ocultado temporariamente
            <Card className="border-red-200 shadow-sm" noPadding>
              <div className="border-b border-red-100 px-6 py-5">
                <h3 className="text-xl font-bold text-red-900">ALERTAS: NÃO SEPARADOS</h3>
                <p className="text-sm text-red-700/80">
                  Pedidos novos e em separação (A e S) recebidos antes de hoje ou após 16h.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {alertasNaoSeparados.length ? (
                  alertasNaoSeparados.map((pedido) => (
                    <button
                      key={`alerta-nao-separado-${pedido.pedidoId}`}
                      type="button"
                      onClick={() => void abrirDetalhePedido(pedido)}
                      className="w-full rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-left transition hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                          <p className="text-xs text-slate-500">
                            {pedido.nomeFantasia || pedido.clienteNome}
                          </p>
                        </div>
                        <Badge variant="danger">ALERTA</Badge>
                      </div>
                      <p className="mt-2 text-xs text-red-800">
                        Recebido em <strong>{formatDateTime(pedido.dataHoraRecebimento)}</strong> e ainda não separado.
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhum pedido pendente de separação.
                  </div>
                )}
              </div>
            </Card> */}

            {/* ALERTAS: NÃO EMBARCADOS - ocultado temporariamente
            <Card className="border-orange-200 shadow-sm" noPadding>
              <div className="border-b border-orange-100 px-6 py-5">
                <h3 className="text-xl font-bold text-orange-900">ALERTAS: NÃO EMBARCADOS</h3>
                <p className="text-sm text-orange-700/80">
                  Pedidos conferidos (G) recebidos antes de hoje ou após 16h.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {alertasNaoEmbarcados.length ? (
                  alertasNaoEmbarcados.map((pedido) => (
                    <button
                      key={`alerta-nao-embarcado-${pedido.pedidoId}`}
                      type="button"
                      onClick={() => void abrirDetalhePedido(pedido)}
                      className="w-full rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-left transition hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                          <p className="text-xs text-slate-500">
                            {pedido.nomeFantasia || pedido.clienteNome}
                          </p>
                        </div>
                        <Badge variant="warning">G</Badge>
                      </div>
                      <p className="mt-2 text-xs text-orange-800">
                        Recebido em <strong>{formatDateTime(pedido.dataHoraRecebimento)}</strong> e conferido mas não embarcado.
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhum pedido pendente de embarque.
                  </div>
                )}
              </div>
            </Card> */}

            {/* PENDÊNCIAS - ocultado temporariamente
            <Card className="border-slate-200 shadow-sm" noPadding>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">Pendencias</h3>
                <p className="text-sm text-slate-500">
                  Pedidos com entregas geradas mas com produtos pendentes.
                </p>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto p-6">
                {pendencias?.pedidos?.length ? (
                  pendencias.pedidos.map((pedido) => (
                    <button
                      key={`pendencia-${pedido.pedidoId}`}
                      type="button"
                      onClick={() => void abrirDetalhePedido(pedido)}
                      className="w-full rounded-xl border border-purple-100 bg-purple-50/70 px-4 py-3 text-left transition hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
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
                      {pedido.produtosPendentes?.length > 0 && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
                            Produtos pendentes
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {pedido.produtosPendentes.map((produto) => (
                              <div
                                key={`pendencia-card-${pedido.pedidoId}-${produto.produtoId ?? produto.codigo ?? produto.nome}`}
                                className="flex items-start justify-between gap-3 text-xs text-red-900"
                              >
                                <span className="min-w-0 truncate font-medium">
                                  {produto.codigo ? `${produto.codigo} - ` : ''}{produto.nome}
                                </span>
                                <strong className="shrink-0 rounded-full bg-red-700 px-2 py-0.5 text-[10px] text-white">
                                  Qtd. {produto.quantidade}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">
                    Nenhuma pendencia no lote consultado.
                  </div>
                )}
              </div>
            </Card>
            */}
          </div>
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
        titleClassName="text-2xl sm:text-3xl"
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
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Data do recebimento e horário</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatDateTime(pedidoSelecionado.dataHoraRecebimento)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cidade / Bairro / UF</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {[dadosPedido(pedidoDetalhe?.pedido, pedidoDetalhe?.logistica).cidade || pedidoSelecionado.cidade,
                    dadosPedido(pedidoDetalhe?.pedido, pedidoDetalhe?.logistica).bairro || pedidoSelecionado.bairro,
                    dadosPedido(pedidoDetalhe?.pedido, pedidoDetalhe?.logistica).uf || pedidoSelecionado.uf].filter(Boolean).join(' / ') || 'Não informado'}
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

                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-900">Separações</h4>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                        <p><span className="block text-xs text-slate-500">Nome do separador</span><strong>{dadosPedido(pedidoDetalhe?.pedido, pedidoDetalhe?.logistica).separadorNome || pedidoSelecionado.separadorNome || 'Não informado'}</strong></p>
                        <p><span className="block text-xs text-slate-500">Nome do conferente</span><strong>{dadosPedido(pedidoDetalhe?.pedido, pedidoDetalhe?.logistica).conferenteNome || pedidoSelecionado.conferenteNome || pedidoSelecionado.usuarioConfirmacaoNome || 'Não informado'}</strong></p>
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
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatText(separacao.STATUS_DESCRICAO, formatText(separacao.STATUS))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Separador</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatText(
                                      separacao.FUNCIONARIO_SEPARACAO_NOME || separacao.USUARIO_NOME,
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
                        <div className="flex items-center justify-between gap-3">
                          <span>Transportadora</span>
                          <strong className="text-slate-900">
                            {pedidoSelecionado.transportadoraNome || '-'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Vinculado ao controle</span>
                          <strong className="text-slate-900">
                            {formatDateTime(pedidoSelecionado.dataHoraControle)}
                          </strong>
                        </div>
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

                {pedidoSelecionado.statusCodigo === 'PENDENCIAS' &&
                  pedidoSelecionado.possuiProdutosFaltando &&
                  itensPendentesModal.length > 0 && (
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-4',
                      pedidoSelecionado.statusCodigo === 'PENDENCIAS'
                        ? 'border border-red-300 bg-red-50'
                        : 'border border-amber-200 bg-amber-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4
                        className={cn(
                          'text-sm font-bold',
                          pedidoSelecionado.statusCodigo === 'PENDENCIAS'
                            ? 'text-red-900'
                            : 'text-amber-900'
                        )}
                      >
                        Itens pendentes
                      </h4>
                      {pedidoSelecionado.statusCodigo === 'PENDENCIAS' && (
                        <Badge variant="danger">{itensPendentesModal.length} item(ns)</Badge>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {itensPendentesModal.map((produto) => (
                        <div
                          key={`pendencia-${produto.produtoId ?? produto.codigo ?? produto.nome}`}
                          className={cn(
                            'rounded-xl px-3 py-3 text-sm',
                            pedidoSelecionado.statusCodigo === 'PENDENCIAS'
                              ? 'border border-red-300 bg-red-100 text-red-950 shadow-sm'
                              : 'bg-white/70 text-amber-900'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold">
                                {produto.codigo ? `${produto.codigo} - ` : ''}
                                {produto.nome}
                              </p>
                            </div>
                            <strong
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-xs',
                                pedidoSelecionado.statusCodigo === 'PENDENCIAS'
                                  ? 'bg-red-700 text-white'
                                  : 'bg-amber-200 text-amber-900'
                              )}
                            >
                              Qtd. {produto.quantidade}
                            </strong>
                          </div>
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

        <Modal
          isOpen={Boolean(listaPedidos)}
          onClose={fecharListaPedidos}
          title={listaPedidos?.titulo || 'Pedidos'}
          size="xl"
        >
          {listaPedidos && (
            <div className="space-y-4">
              <ResumoStatusPedidos itens={listaPedidos.codigo === 'PENDENCIAS'
                ? [{ codigo: 'PENDENCIAS', titulo: 'Pedidos com produtos não encontrados', total: listaPedidos.pedidos.length }]
                : resumirPedidosPorStatus(listaPedidos.pedidos)} />
              {listaPedidos.descricao && <p className="text-sm text-slate-500">{listaPedidos.descricao}</p>}

              {listaPedidos.pedidos.length > 0 && (
              <p className="text-sm font-semibold text-slate-700">
                {listaPedidos.pedidos.length}{' '}
                {listaPedidos.pedidos.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
              </p>
              )}

              {listaPedidos.pedidos.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                  Nenhum pedido encontrado nesta etapa.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {(listaPedidos.titulo === 'PEDIDOS ATRASADOS' ? [
                    { titulo: 'PEDIDOS NÃO SEPARADOS', pedidos: listaPedidos.pedidos.filter((pedido) => pedido.statusCodigo === 'ALERTAS_NAO_SEPARADOS') },
                    { titulo: 'PEDIDOS SEPARADOS E NÃO CONFERIDOS', pedidos: listaPedidos.pedidos.filter((pedido) => pedido.statusCodigo === 'ALERTAS_NAO_CONFERIDOS') },
                    { titulo: 'PEDIDOS CONFERIDOS E NÃO EMBARCADOS', pedidos: listaPedidos.pedidos.filter((pedido) => pedido.statusCodigo === 'ALERTAS_NAO_EMBARCADOS') },
                  ] : [{ titulo: '', pedidos: listaPedidos.pedidos }]).map((grupo) => (
                    <div key={grupo.titulo}>
                      {grupo.titulo && <h4 className="bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800">{grupo.pedidos.length > 0 ? `${grupo.pedidos.length} ` : ''}{grupo.titulo}</h4>}
                      {grupo.titulo && grupo.pedidos.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Nenhum pedido nesta etapa.</p>}
                      {grupo.pedidos.map((pedido) => {
                    const ehAlerta = pedido.statusCodigo.startsWith('ALERTAS_');
                    const ehPendencia = pedido.statusCodigo === 'PENDENCIAS' || pedido.possuiProdutosFaltando;

                    return (
                      <button
                        key={`lista-${pedido.pedidoId}`}
                        type="button"
                        onClick={() => void abrirDetalhePedido(pedido)}
                        className="w-full px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <p className="text-xl font-bold text-slate-900">Pedido #{pedido.pedidoId}</p>
                              <span className="text-xs font-semibold text-slate-600">
                                Recebimento: {formatDateTime(pedido.dataHoraRecebimento)}
                              </span>
                            </div>
                            <p className="max-w-[240px] truncate text-xs text-slate-500">
                              {pedido.nomeFantasia || pedido.clienteNome}
                            </p>
                            {ehAlerta && (
                              <>
                              <div className="mt-2 inline-flex max-w-full items-center rounded-md bg-rose-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-800">
                                Situacao: {pedido.situacaoAtual || pedido.statusDescricao}
                              </div>
                              <p className="mt-1 text-[11px] font-medium text-rose-700">
                                Recebido às {formatTimeOnlyFromDateTime(pedido.dataHoraRecebimento)}
                              </p>
                              </>
                            )}
                            {(pedido.transportadoraNome || pedido.dataHoraControle) && !ehAlerta && (
                              <div className="mt-1 space-y-0.5 text-[11px] text-emerald-700">
                                {pedido.transportadoraNome && (
                                  <p className="truncate font-medium">
                                    Transportadora: {pedido.transportadoraNome}
                                  </p>
                                )}
                                {pedido.dataHoraControle && (
                                  <p>Vinculado em {formatDateTime(pedido.dataHoraControle)}</p>
                                )}
                              </div>
                            )}
                          </div>

                        </div>

                        <PedidoInformacoes pedido={pedido} carregarDetalhe={fetchPedidoDetalhe} />

                        {ehPendencia && pedido.produtosPendentes.length > 0 && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                              Itens pendentes
                            </p>
                            <div className="mt-2 space-y-1 text-xs text-amber-900">
                              {pedido.produtosPendentes.map((produto) => (
                                <div
                                  key={`lista-pendencia-${pedido.pedidoId}-${produto.produtoId ?? produto.codigo ?? produto.nome}`}
                                  className="flex items-start justify-between gap-3"
                                >
                                  <span className="min-w-0 truncate">
                                    {produto.codigo ? `${produto.codigo} - ` : ''}{produto.nome}
                                  </span>
                                  <strong className="shrink-0">Qtd. {produto.quantidade}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                          Ver detalhes
                          <ClipboardList className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
    </AppLayout>
  );
}

Home.usesAppLayout = true;

export default Home;
