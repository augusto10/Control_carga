import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  RefreshCw,
  Filter,
  Download,
  AlertTriangle,
  LayoutDashboard,
  Search,
  Truck,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import AdminRoute from '@/components/admin/AdminRoute';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const MotionCard = motion.create(Card);

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

const parsePedidoDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numericDate = new Date(Number(raw));
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  if (raw.includes('T')) {
    const isoDate = parseISO(raw);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  const nativeDate = new Date(raw);
  return Number.isNaN(nativeDate.getTime()) ? null : nativeDate;
};

const getDataReferenciaPedido = (p: PedidoStatus) => {
  return (
    parsePedidoDate(p.DATA_HORA_CADASTRO) ||
    parsePedidoDate((p as any).DATA_CADASTRO) ||
    parsePedidoDate((p as any).DATA_HORA_PEDIDO) ||
    parsePedidoDate((p as any).DATA_PEDIDO) ||
    parsePedidoDate((p as any).DATA_HORA_EMISSAO) ||
    parsePedidoDate((p as any).DATA_EMISSAO) ||
    parsePedidoDate((p as any).EMISSAO) ||
    parsePedidoDate((p as any).DATA) ||
    parsePedidoDate(p.DATA_HORA_RECEBIMENTO) ||
    parsePedidoDate((p as any).DATA_RECEBIMENTO) ||
    parsePedidoDate(p.DATA_ENTREGA) ||
    null
  );
};

function StatusPedidosContent() {
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
      setError(null);
      
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
        .map((p) => getDataReferenciaPedido(p))
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

  const determinarStatusPedido = (pedido: PedidoStatus): { 
    status: StatusFiltro, 
    label: string, 
    variant: 'warning' | 'success' | 'info' | 'danger' | 'default', 
    icon: React.ReactNode 
  } => {
    if (pedido.CANCELADO === 'S') {
      return {
        status: 'todos',
        label: 'Cancelado',
        variant: 'danger',
        icon: <AlertTriangle className="w-3 h-3" />
      };
    }

    if (pedido.NUMERO_NOTA) {
      return {
        status: 'aguardando-entrega',
        label: 'Aguardando Entrega',
        variant: 'info',
        icon: <Clock className="w-3 h-3" />
      };
    }

    if (pedido.SEPARADO_PARA_RECEBIMENTO === 'N' && pedido.PEDIDO_FECHADO === 'S') {
      return {
        status: 'separacao',
        label: 'Em Separação',
        variant: 'warning',
        icon: <Package className="w-3 h-3" />
      };
    }

    if (pedido.SEPARADO_PARA_RECEBIMENTO === 'S') {
      return {
        status: 'separado',
        label: 'Separado',
        variant: 'success',
        icon: <CheckCircle2 className="w-3 h-3" />
      };
    }

    return {
      status: 'todos',
      label: 'Outro',
      variant: 'default',
      icon: <Package className="w-3 h-3" />
    };
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const pedidoSelecionadoId = router.query.pedido
      ? Number(router.query.pedido as string)
      : null;

    if (pedidoSelecionadoId && pedido.ORCAMENTO_ID !== pedidoSelecionadoId) {
      return false;
    }

    if (filtroStatus === 'todos') return true;
    
    const status = determinarStatusPedido(pedido);
    return status.status === filtroStatus;
  });

  const formatarData = (data: Date | null) => (data ? format(data, "dd/MM/yy HH:mm", { locale: ptBR }) : '-');

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-3 sm:p-4"
          noPadding
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{stats.total}</p>
              <p className="text-[10px] sm:text-sm text-slate-500 truncate">Total</p>
            </div>
          </div>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card-orange/10 border-card-orange/20 p-3 sm:p-4"
          noPadding
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card-orange/20 flex items-center justify-center text-card-orange shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-card-orange truncate">{stats.separacao}</p>
              <p className="text-[10px] sm:text-sm text-card-orange/80 truncate">Separação</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-card-orange/10 rounded-full h-1 sm:h-1.5 overflow-hidden">
            <div 
              className="bg-card-orange h-full transition-all duration-500" 
              style={{ width: `${stats.total > 0 ? (stats.separacao / stats.total) * 100 : 0}%` }}
            />
          </div>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card-green/10 border-card-green/20 p-3 sm:p-4"
          noPadding
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card-green/20 flex items-center justify-center text-card-green shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-card-green truncate">{stats.separado}</p>
              <p className="text-[10px] sm:text-sm text-card-green/80 truncate">Separados</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-card-green/10 rounded-full h-1 sm:h-1.5 overflow-hidden">
            <div 
              className="bg-card-green h-full transition-all duration-500" 
              style={{ width: `${stats.total > 0 ? (stats.separado / stats.total) * 100 : 0}%` }}
            />
          </div>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-card-blue/10 border-card-blue/20 p-3 sm:p-4"
          noPadding
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card-blue/20 flex items-center justify-center text-card-blue shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-card-blue truncate">{stats.aguardandoEntrega}</p>
              <p className="text-[10px] sm:text-sm text-card-blue/80 truncate">Aguardando</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 w-full bg-card-blue/10 rounded-full h-1 sm:h-1.5 overflow-hidden">
            <div 
              className="bg-card-blue h-full transition-all duration-500" 
              style={{ width: `${stats.total > 0 ? (stats.aguardandoEntrega / stats.total) * 100 : 0}%` }}
            />
          </div>
        </MotionCard>
      </div>

      {/* Filtros e Ações */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Filter className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-semibold text-slate-800">Filtrar por Status</h3>
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start sm:justify-center lg:justify-end">
            {[
              { id: 'todos', label: 'Todos', count: stats.total, icon: TrendingUp },
              { id: 'separacao', label: 'Separação', count: stats.separacao, icon: Package, color: 'text-amber-600' },
              { id: 'separado', label: 'Separados', count: stats.separado, icon: CheckCircle2, color: 'text-emerald-600' },
              { id: 'aguardando-entrega', label: 'Aguardando', count: stats.aguardandoEntrega, icon: Clock, color: 'text-blue-600' },
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setFiltroStatus(filtro.id as StatusFiltro)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                  filtroStatus === filtro.id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <filtro.icon className={cn("w-3.5 h-3.5 sm:w-4 h-4", filtroStatus !== filtro.id && filtro.color)} />
                <span className="whitespace-nowrap">{filtro.label}</span>
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px]",
                  filtroStatus === filtro.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {filtro.count}
                </span>
              </button>
            ))}
          </div>
          <div className="w-full lg:w-auto flex justify-end">
            <Button variant="outline" size="sm" onClick={carregarPedidos} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela de Pedidos */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Pedido</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 hidden sm:table-cell">Nota</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Status</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Recebimento</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Valor</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Endereço</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                    <p className="text-sm">Tente ajustar seus filtros de busca</p>
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const status = determinarStatusPedido(pedido);
                  const pedidoSelecionadoId = router.query.pedido ? Number(router.query.pedido as string) : null;
                  const isSelected = pedidoSelecionadoId === pedido.ORCAMENTO_ID;

                  return (
                    <tr 
                      key={pedido.ORCAMENTO_ID} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        isSelected && "bg-emerald-50/50 border-l-4 border-l-emerald-500"
                      )}
                    >
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-800 text-sm">#{pedido.ORCAMENTO_ID}</span>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {pedido.NUMERO_NOTA || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                          <span className="font-semibold text-slate-700 text-sm truncate" title={pedido.CLIENTE_NOME}>
                            {pedido.CLIENTE_NOME}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {pedido.NOME_FANTASIA || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit whitespace-nowrap">
                          {status.icon}
                          <span className="hidden sm:inline">{status.label}</span>
                          <span className="sm:hidden">{status.label.split(' ')[0]}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatarData(getDataReferenciaPedido(pedido))}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="font-bold text-slate-700 text-sm">
                          {formatarValor(pedido.VALOR_PEDIDO)}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-xs text-slate-600 truncate" title={`${pedido.LOGRADOURO_ENTREGA}, ${pedido.CEP_ENTREGA}`}>
                            {pedido.LOGRADOURO_ENTREGA || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            CEP: {pedido.CEP_ENTREGA || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs text-slate-500">{pedido.VENDEDOR_NOME}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 text-center sm:text-left">
            Mostrando <strong>{pedidosFiltrados.length}</strong> de <strong>{pedidos.length}</strong> pedidos
          </p>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista
          </Button>
        </div>
      </Card>

      {/* Alerta de Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start sm:items-center gap-3 text-rose-800"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="p-1 hover:bg-rose-100 rounded-lg transition-colors text-rose-400 hover:text-rose-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const StatusPedidosPage: NextPage = () => {
  return (
    <AdminRoute>
      <Head>
        <title>Status dos Pedidos - Sistema de Controle de Carga</title>
        <meta name="description" content="Acompanhe o status dos pedidos: separação, separado e aguardando entrega" />
      </Head>
      <AppLayout
        title="Status dos Pedidos"
        subtitle="Acompanhe o ciclo completo dos pedidos em tempo real"
      >
        <StatusPedidosContent />
      </AppLayout>
    </AdminRoute>
  );
};

export default StatusPedidosPage;

(StatusPedidosPage as any).usesAppLayout = true;

