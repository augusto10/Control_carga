import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import AdminRoute from '@/components/admin/AdminRoute';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';

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
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  }
  return null;
};

const getApuracaoId = (apuracao: ApuracaoItem) => {
  return (
    parseApuracaoId(apuracao.ORCAMENTO_BASE_ID) ??
    parseApuracaoId(apuracao.ORCAMENTO_ID) ??
    parseApuracaoId(apuracao.ORCAMENTO) ??
    parseApuracaoId(apuracao.ORCAMENTOBASEID) ??
    parseApuracaoId(apuracao.ORCAMENTO_BASE) ??
    parseApuracaoId(apuracao.ORCAMENTOBASE)
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

const parsePedidoDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numericDate = new Date(Number(raw));
    if (!Number.isNaN(numericDate.getTime())) return numericDate;
  }

  if (raw.includes('T')) {
    const isoDate = parseISO(raw);
    if (!Number.isNaN(isoDate.getTime())) return isoDate;
  }

  const nativeDate = new Date(raw);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const formatos = [
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd'
  ];

  for (const formato of formatos) {
    const parsedDate = parse(raw, formato, new Date());
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }

  return null;
};

const getDataReferenciaPedido = (p: PedidoResumo) => {
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

function ResumoDiarioContent() {
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
        headers: { accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

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
      }

      const pedidosEnriquecidos = pedidosBase.map((p) => {
        const apuracao = apuracoesMap.get(p.ORCAMENTO_ID);
        return apuracao ? { ...p, NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null } : p;
      });

      setPedidos(pedidosEnriquecidos);
      calcularEstatisticas(pedidosEnriquecidos);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      setError(err.message || 'Erro ao carregar pedidos');
      setPedidos([]);
      setStats({
        totalPedidos: 0, totalValor: 0, entregas: 0, naoEntrega: 0,
        emSeparacao: 0, separados: 0, aguardandoEntrega: 0, cancelados: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (lista: PedidoResumo[]) => {
    const totalPedidos = lista.length;
    const totalValor = lista.reduce((acc, p) => acc + (p.VALOR_PEDIDO || 0), 0);
    const entregas = lista.filter(p => p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO').length;
    const naoEntrega = lista.filter(p => p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO').length;
    const emSeparacao = lista.filter(p => p.SEPARADO_PARA_RECEBIMENTO === 'N' && p.PEDIDO_FECHADO === 'S' && !p.NUMERO_NOTA).length;
    const separados = lista.filter(p => p.SEPARADO_PARA_RECEBIMENTO === 'S' && !p.DATA_ENTREGA && !p.NUMERO_NOTA).length;
    const aguardandoEntrega = lista.filter(p => !!p.NUMERO_NOTA && p.CANCELADO !== 'S').length;
    const cancelados = lista.filter(p => p.CANCELADO === 'S').length;

    setStats({ totalPedidos, totalValor, entregas, naoEntrega, emSeparacao, separados, aguardandoEntrega, cancelados });
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const formatarData = (data: Date | null) => (data ? format(data, "dd/MM/yy HH:mm", { locale: ptBR }) : '-');

  return (
    <div className="space-y-6">
      {/* Header com Filtro */}
      <Card className="p-4 md:p-6 bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Resumo Diário</h2>
              <p className="text-xs sm:text-sm text-slate-500">Visão consolidada dos pedidos por dia</p>
            </div>
          </div>
          
          <div className="flex items-end gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
            <div className="space-y-1.5 flex-1 md:flex-none">
              <Label>Data</Label>
              <Input
                type="date"
                value={dataReferencia}
                onChange={e => setDataReferencia(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={carregarPedidos}
              disabled={loading}
              className={cn("rounded-xl shrink-0 border-slate-200 hover:bg-slate-50", loading && "animate-spin")}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 font-medium"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Pedidos', value: stats.totalPedidos, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Valor Total', value: formatarValor(stats.totalValor), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Entregas', value: stats.entregas, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Não Entrega', value: stats.naoEntrega, icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, idx) => (
          <Card key={idx} className="p-5 border-none shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
                <p className={cn("text-2xl font-bold tracking-tight", item.color)}>{item.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", item.bg, item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Situação Detalhada */}
        <Card className="lg:col-span-4 p-4 sm:p-6 h-fit">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Situação dos Pedidos
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
            {[
              { label: 'Separados', count: stats.separados, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', total: stats.totalPedidos },
              { label: 'Em Separação', count: stats.emSeparacao, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', total: stats.totalPedidos },
              { label: 'Aguardando', count: stats.aguardandoEntrega, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', total: stats.totalPedidos },
              { label: 'Cancelados', count: stats.cancelados, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', total: stats.totalPedidos },
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-[10px] sm:text-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", item.bg, item.color)}>
                      <item.icon className="w-3.5 h-3.5 sm:w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 truncate max-w-[80px] sm:max-w-none">{item.label}</span>
                  </div>
                  <Badge variant={item.label === 'Cancelados' ? 'danger' : item.label === 'Separados' ? 'success' : 'primary'} className="text-[9px] sm:text-xs px-1.5 py-0">
                    {item.count}
                  </Badge>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 sm:h-1.5 overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", 
                      item.label === 'Separados' ? 'bg-emerald-500' : 
                      item.label === 'Em Separação' ? 'bg-amber-500' :
                      item.label === 'Cancelados' ? 'bg-red-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabela de Pedidos */}
        <Card className="lg:col-span-8 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Principais Pedidos
            </h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
              Mostrando {Math.min(pedidos.length, 50)} de {pedidos.length}
            </span>
          </div>
          
          <div className="overflow-x-auto max-h-[450px]">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <p className="font-medium">Carregando dados...</p>
              </div>
            ) : pedidos.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Package className="w-12 h-12 opacity-20" />
                <p className="font-medium">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Pedido / Nota</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right hidden sm:table-cell w-24">Valor</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center hidden md:table-cell w-24">Tipo</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right hidden lg:table-cell w-32">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.slice(0, 50).map((pedido) => (
                    <tr key={pedido.ORCAMENTO_ID} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">#{pedido.ORCAMENTO_ID}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                            {pedido.NUMERO_NOTA ? `NFE: ${pedido.NUMERO_NOTA}` : 'Sem nota'}
                          </span>
                        </div>
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
                      <td className="px-4 py-4 text-right hidden sm:table-cell">
                        <span className="font-bold text-emerald-600 text-sm">
                          {formatarValor(pedido.VALOR_PEDIDO)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <Badge 
                          variant={pedido.TIPO_ENTREGA === 'NDF' || pedido.TIPO_ENTREGA === 'ATO' ? 'secondary' : 'success'}
                          className="flex items-center gap-1 justify-center mx-auto"
                        >
                          {pedido.TIPO_ENTREGA === 'NDF' || pedido.TIPO_ENTREGA === 'ATO' ? (
                            'Retirada'
                          ) : (
                            <>
                              <Truck className="w-3 h-3" />
                              Entrega
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right hidden lg:table-cell">
                        <span className="text-xs font-medium text-slate-500">
                          {formatarData(getDataReferenciaPedido(pedido))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const ResumoDiarioPage: NextPage = () => {
  return (
    <AdminRoute>
      <Head>
        <title>Resumo Diário - Admin</title>
      </Head>
      <AppLayout 
        title="Resumo Diário de Pedidos" 
        subtitle="Acompanhe o desempenho diário de pedidos e entregas"
      >
        <ResumoDiarioContent />
      </AppLayout>
    </AdminRoute>
  );
};

export default ResumoDiarioPage;

(ResumoDiarioPage as any).usesAppLayout = true;
