import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ExpedicaoCards } from '@/components/dashboard/ExpedicaoCards';
import {
  AlertCircle,
  ClipboardList,
  Package,
  PackageCheck,
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

type DashboardItem = {
  codigo: StatusCode;
  titulo: string;
  total: number;
  pedidos?: Array<{
    pedidoId: number;
    totalItensPendentes: number;
    produtosPendentes?: Array<{ nome: string; quantidade: number }>;
  }>;
};

type DashboardResponse = {
  generatedAt: string;
  filtros?: {
    dataInicio?: string | null;
    dataFim?: string | null;
  };
  resumo?: {
    totalPedidos?: number;
  };
  indicadores: DashboardItem[];
  warning?: string;
};

const statusConfig: Record<StatusCode, { icon: typeof Package; colorClass: string; iconClassName?: string; backgroundColor?: string; backgroundImage?: string }> = {
  PEDIDO_NOVO: { icon: Package, colorClass: 'from-[#3d8df0] via-[#2472d8] to-[#1b5cb6]', iconClassName: 'text-[#2472d8]', backgroundColor: '#2472d8', backgroundImage: 'linear-gradient(180deg, #3d8df0 0%, #2472d8 52%, #1b5cb6 100%)' },
  PEDIDO_EM_SEPARACAO: { icon: ClipboardList, colorClass: 'from-[#ffcf35] via-[#ffbf18] to-[#f4a300]', iconClassName: 'text-[#f2a900]', backgroundColor: '#ffbf18', backgroundImage: 'linear-gradient(180deg, #ffcf35 0%, #ffbf18 52%, #f4a300 100%)' },
  PEDIDO_SEPARADO: { icon: PackageCheck, colorClass: 'from-[#67c857] via-[#47b44b] to-[#2d9640]', iconClassName: 'text-[#39a64a]', backgroundColor: '#47b44b', backgroundImage: 'linear-gradient(180deg, #67c857 0%, #47b44b 52%, #2d9640 100%)' },
  PEDIDO_EMBARCADO: { icon: UserCheck, colorClass: 'from-[#ffcf35] via-[#ffbf18] to-[#f4a300]', iconClassName: 'text-[#f2a900]', backgroundColor: '#ffbf18', backgroundImage: 'linear-gradient(180deg, #ffcf35 0%, #ffbf18 52%, #f4a300 100%)' },
  PEDIDOS_EMBARCADOS: { icon: PackageCheck, colorClass: 'from-[#43c962] via-[#29b551] to-[#229043]', iconClassName: 'text-[#29b551]', backgroundColor: '#29b551', backgroundImage: 'linear-gradient(180deg, #43c962 0%, #29b551 52%, #229043 100%)' },
  PENDENCIAS: { icon: AlertCircle, colorClass: 'from-purple-700 to-purple-950' },
  ALERTAS_NAO_SEPARADOS: { icon: AlertCircle, colorClass: 'from-red-700 to-red-950' },
  ALERTAS_NAO_CONFERIDOS: { icon: AlertCircle, colorClass: 'from-amber-500 to-amber-800' },
  ALERTAS_NAO_EMBARCADOS: { icon: AlertCircle, colorClass: 'from-orange-600 to-orange-950' },
};

const emptyDashboard: DashboardResponse = {
  generatedAt: '',
  indicadores: [],
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDashboardQueries = () => {
  const dataFim = new Date();
  const dataInicioAlertas = new Date(dataFim);
  dataInicioAlertas.setDate(dataInicioAlertas.getDate() - 29);

  const hoje = formatDateInputValue(dataFim);
  return {
    etapas: new URLSearchParams({
      data_inicio: hoje,
      data_fim: hoje,
      escopo: 'principal',
    }),
    alertas: new URLSearchParams({
      data_inicio: formatDateInputValue(dataInicioAlertas),
      data_fim: hoje,
    }),
  };
};

const PAINEL_AUTO_REFRESH_INTERVAL_MS = 3 * 60_000;
const DASHBOARD_LOCAL_CACHE_KEY = 'dashboard-logistica-cache-v8';
const DASHBOARD_ALERTAS_LOCAL_CACHE_KEY = 'dashboard-logistica-alertas-cache-v1';

const saveSnapshot = (key: string, data: DashboardResponse) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // O snapshot local e apenas uma melhoria de carregamento.
  }
};

const isDashboardFallbackVazio = (data: DashboardResponse) =>
  Boolean(data.warning) &&
  ((data.resumo?.totalPedidos || 0) === 0) &&
  data.indicadores.every((item) => (item.total || 0) === 0);

export default function ControlePedidosPainel() {
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard);
  const [dashboardAlertas, setDashboardAlertas] = useState<DashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [loadingSecondary, setLoadingSecondary] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const queries = getDashboardQueries();
      queries.etapas.set('force', '1');
      queries.etapas.set('t', String(Date.now()));
      queries.alertas.set('force', '1');
      queries.alertas.set('t', String(Date.now()));
      const etapasResponse = await fetch(
        `/api/dashboard/logistica-inicial?${queries.etapas.toString()}`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (!etapasResponse.ok) throw new Error('Falha ao carregar as etapas do painel');

      const etapasData = await etapasResponse.json();
      setDashboard(etapasData);
      setLoading(false);
      saveSnapshot(DASHBOARD_LOCAL_CACHE_KEY, etapasData);

      try {
        const alertasResponse = await fetch(
          `/api/dashboard/logistica-inicial?${queries.alertas.toString()}`,
          { credentials: 'include', cache: 'no-store' }
        );
        if (!alertasResponse.ok) throw new Error('Falha ao carregar alertas do painel');

        const alertasData = await alertasResponse.json();
        if (!isDashboardFallbackVazio(alertasData)) {
          setDashboardAlertas(alertasData);
          saveSnapshot(DASHBOARD_ALERTAS_LOCAL_CACHE_KEY, alertasData);
        }
      } finally {
        setLoadingSecondary(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o painel');
      setLoadingSecondary(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queries = getDashboardQueries();
    const dataInicio = queries.etapas.get('data_inicio');
    const dataFim = queries.etapas.get('data_fim');
    const dataInicioAlertas = queries.alertas.get('data_inicio');

    const restoreSnapshot = (key: string, isAlertas: boolean) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw) as DashboardResponse;
        const periodoValido = isAlertas
          ? parsed.filtros?.dataInicio === dataInicioAlertas && parsed.filtros?.dataFim === dataFim
          : parsed.filtros?.dataInicio === dataInicio && parsed.filtros?.dataFim === dataFim;
        if (!periodoValido || !Array.isArray(parsed.indicadores)) return;

        if (isAlertas) {
          setDashboardAlertas(parsed);
          setLoadingSecondary(false);
        } else {
          setDashboard(parsed);
          setLoading(false);
        }
      } catch {
        // O painel segue com a consulta da API quando o snapshot local nao e valido.
      }
    };

    restoreSnapshot(DASHBOARD_LOCAL_CACHE_KEY, false);
    restoreSnapshot(DASHBOARD_ALERTAS_LOCAL_CACHE_KEY, true);
    void loadDashboard();

    const intervalId = window.setInterval(loadDashboard, PAINEL_AUTO_REFRESH_INTERVAL_MS);

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }

    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const getTotal = (codigo: StatusCode) =>
    dashboard.indicadores.find((item) => item.codigo === codigo)?.total || 0;
  const stageCards = [
    { codigo: 'PEDIDO_NOVO' as StatusCode, titulo: 'PEDIDOS NOVOS', icon: Package },
    { codigo: 'PEDIDO_EM_SEPARACAO' as StatusCode, titulo: 'PEDIDOS EM SEPARACAO', icon: ClipboardList },
    { codigo: 'PEDIDO_SEPARADO' as StatusCode, titulo: 'PEDIDOS SEPARADOS AGUARDANDO CONFERENCIA', icon: PackageCheck },
    { codigo: 'PEDIDO_EMBARCADO' as StatusCode, titulo: 'PEDIDOS CONFERIDOS', icon: UserCheck },
    { codigo: 'PEDIDOS_EMBARCADOS' as StatusCode, titulo: 'PEDIDOS EMBARCADOS', icon: PackageCheck },
  ];
  const getTotalAlerta = (codigo: StatusCode) =>
    dashboardAlertas.indicadores.find((item) => item.codigo === codigo)?.total || 0;
  const pendenciasAlertasItem = dashboardAlertas.indicadores.find(
    (item) => item.codigo === 'PENDENCIAS'
  );
  const previewPendencias = (pendenciasAlertasItem?.pedidos || []).flatMap((pedido) => {
    if (pedido.produtosPendentes?.length) {
      return pedido.produtosPendentes.slice(0, 2).map(
        (produto) => `Pedido ${pedido.pedidoId}: ${produto.nome} (${produto.quantidade})`
      );
    }
    return [`Pedido ${pedido.pedidoId}: ${pedido.totalItensPendentes} item(ns)`];
  }).slice(0, 6);

  return (
    <div
      className="min-h-screen bg-slate-950 px-4 py-5 text-white md:px-8 md:py-6"
      style={{ backgroundColor: '#020617' }}
    >
        <div className="mx-auto max-w-[1800px]">
          {loading ? (
            <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-300" />
            </div>
          ) : (
            <>
              <h1 className="mb-5 text-center text-2xl font-black uppercase tracking-[0.12em] text-white md:text-3xl">
                Controle de Pedidos
              </h1>
              {error && (
                <p className="mb-4 text-center text-sm font-semibold text-amber-300">{error}</p>
              )}
              <ExpedicaoCards
                wideLayout
                loadingStages={false}
                loadingSecondary={loadingSecondary}
                stageCards={stageCards.map((card, index) => ({
                  key: `${card.codigo}-${index}`,
                  titulo: card.titulo,
                  total: getTotal(card.codigo),
                  icon: card.icon,
                  colorClass: statusConfig[card.codigo].colorClass,
                  iconClassName: statusConfig[card.codigo].iconClassName,
                  backgroundColor: statusConfig[card.codigo].backgroundColor,
                  backgroundImage: statusConfig[card.codigo].backgroundImage,
                  onClick: () => undefined,
                }))}
                alertas={{
                  naoSeparado: getTotalAlerta('ALERTAS_NAO_SEPARADOS'),
                  naoConferido: getTotalAlerta('ALERTAS_NAO_CONFERIDOS'),
                  naoEmbarcado: getTotalAlerta('ALERTAS_NAO_EMBARCADOS'),
                  total: getTotalAlerta('ALERTAS_NAO_SEPARADOS') + getTotalAlerta('ALERTAS_NAO_CONFERIDOS') + getTotalAlerta('ALERTAS_NAO_EMBARCADOS'),
                  onClick: () => undefined,
                }}
                pendencias={{
                  total: getTotalAlerta('PENDENCIAS'),
                  previewItems: previewPendencias,
                  onClick: () => undefined,
                }}
              />
            </>
          )}
        </div>
      </div>
  );
}

ControlePedidosPainel.usesAppLayout = true;
