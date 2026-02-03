import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody,
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  IconButton, 
  TextField, 
  Box, 
  CircularProgress, 
  Chip,
  Avatar,
  Tooltip,
  Stack,
  InputAdornment,
  alpha,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  FirstPage as FirstPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  LastPage as LastPageIcon,
  CalendarToday as CalendarTodayIcon,
  LocalShipping as LocalShippingIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Pending as PendingIcon,
  PictureAsPdf as PdfIcon,
  Description as ExcelIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarMonthIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { format, parse, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import VisualPageLayout from '../../../components/VisualPageLayout';
import AdminRoute from '../../../components/AdminRoute';
import { useSnackbar } from 'notistack';

const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);
const MotionCard = motion(Card);

interface Pedido {
  ORCAMENTO_ID: number;
  CLIENTE_NOME: string;
  NOME_FANTASIA: string;
  DATA_HORA_CADASTRO: string;
  DATA_HORA_RECEBIMENTO: string | null;
  LOGRADOURO_ENTREGA: string | null;
  BAIRRO_ENTREGA_ID: number | null;
  CEP_ENTREGA: string | null;
  CEP_CONS_FINAL: string | null;
  VALOR_PEDIDO: number;
  TIPO_ENTREGA: string;
  VENDEDOR_NOME: string;
  CADASTRO_ID: number;
  PEDIDO_FECHADO: string;
  CANCELADO: string;
  DATA_ENTREGA: string | null;
  SEPARADO_PARA_RECEBIMENTO: string | null;
  ENTREGA_POR_TRANSPORTADORA: string | null;
  NUMERO_NOTA?: string | null;
  // Campos possíveis da API externa que podem conter datas
  DATA_PEDIDO?: string;
  DATA_CADASTRO?: string;
  DATA_RECEBIMENTO?: string;
  DATA?: string;
  [key: string]: any;
}

interface PedidosResponse {
  total: number;
  limit: number;
  offset: number;
  data: Pedido[];
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

const parseCadastroId = (value: unknown) => {
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

const getCadastroIdFromApuracao = (apuracao: ApuracaoItem) => {
  const data = apuracao as Record<string, unknown>;
  return (
    parseCadastroId(data.CADASTRO_ID) ??
    parseCadastroId((data as any)?.CADASTROID) ??
    parseCadastroId((data as any)?.CADASTRO)
  );
};

function CicloPedidosContent() {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'primary',
    loading: isLoading,
    delay = 0 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    loading?: boolean;
    delay?: number;
  }) => (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      sx={{
        height: '100%',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '4px', 
        height: '100%', 
        bgcolor: `${color}.main` 
      }} />
      <CardContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="700" sx={{ letterSpacing: 1 }}>
                  {title}
                </Typography>
                <Typography variant="h3" component="div" fontWeight="800" sx={{ color: '#1e293b', mt: 0.5 }}>
                  {value}
                </Typography>
              </Box>
              <Avatar 
                sx={{ 
                  backgroundColor: alpha(theme.palette[color].main, 0.1), 
                  color: `${color}.main`,
                  width: 56,
                  height: 56,
                  borderRadius: 3
                }}
              >
                {icon}
              </Avatar>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" color="success.main" fontWeight="600">
                Acompanhamento em tempo real
              </Typography>
            </Box>
          </Stack>
        )}
      </CardContent>
    </MotionCard>
  );

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje');
  const [filtroEntrega, setFiltroEntrega] = useState('entrega_fechados');
  const [openFiltros, setOpenFiltros] = useState(false);
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Resumo
  const [stats, setStats] = useState({
    hoje: 0,
    mes: 0,
    valorHoje: 0,
    valorMes: 0,
    loading: false
  });

  const parseValorNumero = (v: any) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const s = v.replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isNaN(n) ? 0 : n;
    }
    return 0;
  };
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const pedidosPorPagina = 100;
  
  // Exportação
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');

  // Detalhes do pedido (bairro e cidade)
  const [detalhesPedido, setDetalhesPedido] = useState<Record<string, { bairro: string; cidade: string; estado?: string }>>({});
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<Record<string, boolean>>({});
  
  // Modal de detalhes do pedido
  const [openDetalhesModal, setOpenDetalhesModal] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);

  const getPeriodoConfig = () => {
    if (filtroPeriodo === 'hoje') {
      const hoje = new Date();
      const dataFormatada = format(hoje, 'yyyy-MM-dd');
      return {
        label: 'Hoje',
        inicio: dataFormatada,
        fim: dataFormatada
      };
    }
    if (filtroPeriodo === 'ontem') {
      const ontem = subDays(new Date(), 1);
      const dataFormatada = format(ontem, 'yyyy-MM-dd');
      return {
        label: 'Ontem',
        inicio: dataFormatada,
        fim: dataFormatada
      };
    }
    if (filtroPeriodo === 'semana') {
      const inicioSemana = subDays(new Date(), 7);
      const inicioFormatada = format(inicioSemana, 'yyyy-MM-dd');
      const fimFormatada = format(new Date(), 'yyyy-MM-dd');
      return {
        label: 'Última semana',
        inicio: inicioFormatada,
        fim: fimFormatada
      };
    }
    if (filtroPeriodo === 'mes') {
      const primeiroDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      const fimFormatada = format(new Date(), 'yyyy-MM-dd');
      return {
        label: 'Este mês',
        inicio: primeiroDiaMes,
        fim: fimFormatada
      };
    }
    return {
      label: 'Personalizado',
      inicio: dataInicio,
      fim: dataFim
    };
  };

  const getEntregaLabel = () => {
    if (filtroEntrega === 'entrega_fechados') {
      return 'Entrega e fechados (Padrão)';
    }
    if (filtroEntrega === 'entrega') {
      return 'Somente entrega';
    }
    if (filtroEntrega === 'nao_entrega') {
      return 'Não entrega';
    }
    return 'Todos';
  };

  const parsePedidoDate = (value?: string | null) => {
    if (!value) return null;
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

  const getDataReferenciaPedido = (p: Pedido) => {
    return (
      parsePedidoDate(p.DATA_HORA_RECEBIMENTO) ||
      parsePedidoDate(p.DATA_RECEBIMENTO as any) ||
      parsePedidoDate(p.DATA_HORA_CADASTRO) ||
      parsePedidoDate(p.DATA_CADASTRO as any) ||
      parsePedidoDate(p.DATA_ENTREGA) ||
      parsePedidoDate(p.DATA_PEDIDO as any) ||
      parsePedidoDate(p.DATA as any)
    );
  };

  const periodoAtual = getPeriodoConfig();
  const inicioPeriodo = periodoAtual.inicio
    ? new Date(`${periodoAtual.inicio}T00:00:00`)
    : null;
  const fimPeriodo = periodoAtual.fim
    ? new Date(`${periodoAtual.fim}T23:59:59`)
    : null;

  const filteredPedidos = pedidos.filter(p => {
    // Filtro de busca
    const searchMatch = 
      (p.CLIENTE_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.NOME_FANTASIA || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.VENDEDOR_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ORCAMENTO_ID.toString().includes(searchTerm);

    // Filtro de entrega e status
    let entregaMatch = true;
    if (filtroEntrega === 'entrega_fechados') {
      entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO' && p.PEDIDO_FECHADO === 'S';
    } else if (filtroEntrega === 'entrega') {
      entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
    } else if (filtroEntrega === 'nao_entrega') {
      entregaMatch = p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO';
    } else if (filtroEntrega === 'todos') {
      entregaMatch = true;
    }

    const dataReferencia = getDataReferenciaPedido(p);
    const dataMatch =
      !inicioPeriodo || !fimPeriodo
        ? true
        : !!dataReferencia && dataReferencia >= inicioPeriodo && dataReferencia <= fimPeriodo;

    return searchMatch && entregaMatch && dataMatch;
  });

  // Carregar pedidos na inicialização (apenas uma vez)
  useEffect(() => {
    // Carregar pedidos do dia atual quando o componente for montado
    if (pedidos.length === 0) {
      carregarPedidos();
    }
  }, []);

  // Carregar pedidos quando filtros/pagina mudam
  useEffect(() => {
    // Só carregar automaticamente se o diálogo de filtros estiver fechado
    // ou se a mudança for de página ou tipo de entrega (que não estão no diálogo)
    if (!openFiltros && pedidos.length > 0) {
      carregarPedidos();
    }
  }, [filtroPeriodo, filtroEntrega, paginaAtual, dataInicio, dataFim, openFiltros, pedidos.length]);

  useEffect(() => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      const filtrados = filteredPedidos.filter(p => {
        const isEntrega = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
        return isEntrega;
      });
      const count = filtrados.length;
      const valor = filtrados.reduce((sum, p) => {
        const v = (p as any).VALOR_PEDIDO ?? (p as any).VALOR_TOTAL ?? (p as any).VALOR ?? 0;
        return sum + parseValorNumero(v);
      }, 0);
      setStats({
        hoje: count,
        mes: count,
        valorHoje: valor,
        valorMes: valor,
        loading: false
      });
    } catch {
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [filteredPedidos]);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      
      // Construir URL da API interna com filtros
      const offset = (paginaAtual - 1) * pedidosPorPagina;
      let url = `/api/pedidos/externos?limit=${pedidosPorPagina}&offset=${offset}`;
      const periodo = getPeriodoConfig();
      
      console.log('[CicloPedidos] Carregando pedidos com período:', periodo);
      
      if (periodo.inicio && periodo.fim) {
        url += `&data_inicio=${periodo.inicio}&data_fim=${periodo.fim}`;
        console.log('[CicloPedidos] URL com datas:', url);
      }

      // Adicionar filtro de tipo de entrega
      if (filtroEntrega === 'entrega') {
        url += '&tipo_entrega=EPG,ENT';
      } else if (filtroEntrega === 'entrega_fechados') {
        url += '&tipo_entrega=EPG,ENT&status=FECHADO';
      } else if (filtroEntrega === 'nao_entrega') {
        url += '&tipo_entrega=NDF,ATO';
      }

      // Adicionar termo de busca se houver
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      console.log('[CicloPedidos] Buscando pedidos:', { url, periodo, filtroEntrega, searchTerm });

      const response = await fetch(url, {
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[CicloPedidos] Erro na resposta da API:', { status: response.status, errorData });
        throw new Error(`Erro na API: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data: PedidosResponse = await response.json();
      
      if ((data as any).error) {
        console.error('[CicloPedidos] API retornou erro no corpo:', (data as any).error);
        throw new Error((data as any).error);
      }

      const pedidosBase = data.data || [];
      console.log(`[CicloPedidos] ${pedidosBase.length} pedidos recebidos`);

      // Resto do código de enriquecimento...
      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      if (periodo.inicio) apuracoesUrl.searchParams.set('data_inicio', periodo.inicio);
      if (periodo.fim) apuracoesUrl.searchParams.set('data_fim', periodo.fim);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      let apuracoesMap = new Map<number, ApuracaoItem>();
      let cadastroApuracoesMap = new Map<number, ApuracaoItem>();
      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        cadastroApuracoesMap = new Map(
          (apuracoesData.data || [])
            .map((a) => {
              const id = getCadastroIdFromApuracao(a);
              return id !== null ? [id, a] : null;
            })
            .filter((entry): entry is [number, ApuracaoItem] => entry !== null)
        );
        if (apuracoesMap.size === 0 && (periodo.inicio || periodo.fim)) {
          const apuracoesFallbackUrl = new URL('/api/apuracoes', window.location.origin);
          apuracoesFallbackUrl.searchParams.set('limit', '10000');
          apuracoesFallbackUrl.searchParams.set('offset', '0');
          const apuracoesFallbackResponse = await fetch(apuracoesFallbackUrl.toString(), {
            headers: { accept: 'application/json' }
          });
          if (apuracoesFallbackResponse.ok) {
            const apuracoesFallbackData: ApuracoesResponse = await apuracoesFallbackResponse.json();
            apuracoesMap = buildApuracoesMap(apuracoesFallbackData.data || []);
            cadastroApuracoesMap = new Map(
              (apuracoesFallbackData.data || [])
                .map((a) => {
                  const id = getCadastroIdFromApuracao(a);
                  return id !== null ? [id, a] : null;
                })
                .filter((entry): entry is [number, ApuracaoItem] => entry !== null)
            );
          }
        }
      }

      const periodoInicioDate = periodo.inicio ? new Date(`${periodo.inicio}T00:00:00`) : null;
      const periodoFimDate = periodo.fim ? new Date(`${periodo.fim}T23:59:59`) : null;
      let pedidosParaExibir = pedidosBase;
      let totalFiltradoGlobal = data.total || pedidosParaExibir.length;

      if ((pedidosParaExibir.length === 0 || (data.total || 0) === 0) && (periodo.inicio || periodo.fim)) {
        let urlAll = `/api/pedidos/externos?limit=10000&offset=0`;
        if (filtroEntrega === 'entrega') {
          urlAll += '&tipo_entrega=EPG,ENT';
        } else if (filtroEntrega === 'entrega_fechados') {
          urlAll += '&tipo_entrega=EPG,ENT&status=FECHADO';
        } else if (filtroEntrega === 'nao_entrega') {
          urlAll += '&tipo_entrega=NDF,ATO';
        }
        if (searchTerm.trim()) {
          urlAll += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }
        const respAll = await fetch(urlAll, { headers: { accept: 'application/json' } });
        if (respAll.ok) {
          const dataAll: PedidosResponse = await respAll.json();
          const arr = dataAll.data || [];
          const filtrados = arr.filter((p) => {
            const searchMatch = 
              (p.CLIENTE_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.NOME_FANTASIA || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.VENDEDOR_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.ORCAMENTO_ID.toString().includes(searchTerm);
            let entregaMatch = true;
            if (filtroEntrega === 'entrega_fechados') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO' && p.PEDIDO_FECHADO === 'S';
            } else if (filtroEntrega === 'entrega') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
            } else if (filtroEntrega === 'nao_entrega') {
              entregaMatch = p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO';
            } else if (filtroEntrega === 'todos') {
              entregaMatch = true;
            }
            const dataReferencia = getDataReferenciaPedido(p as any);
            const dataMatch =
              !periodoInicioDate || !periodoFimDate
                ? true
                : !!dataReferencia && dataReferencia >= periodoInicioDate && dataReferencia <= periodoFimDate;
            return searchMatch && entregaMatch && dataMatch;
          });
          totalFiltradoGlobal = filtrados.length;
          pedidosParaExibir = filtrados.slice(offset, offset + pedidosPorPagina);
        }
      }

      const pedidosEnriquecidos = pedidosParaExibir.map((p) => {
        const apuracao = apuracoesMap.get(p.ORCAMENTO_ID) || cadastroApuracoesMap.get(p.CADASTRO_ID);
        const valorBruto = (p as any).VALOR_PEDIDO ?? (p as any).VALOR_TOTAL ?? (p as any).VALOR ?? 0;
        const valorNumerico = parseValorNumero(valorBruto);
        if (!apuracao) {
          return { ...p, VALOR_PEDIDO: valorNumerico };
        }
        return { ...p, VALOR_PEDIDO: valorNumerico, NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null };
      });

      setPedidos(pedidosEnriquecidos);
      setTotalPedidos(totalFiltradoGlobal);
      setTotalPaginas(Math.ceil((totalFiltradoGlobal) / pedidosPorPagina));
      setError(null);

      // Buscar dados de endereço automaticamente para todos os pedidos
      if (pedidosEnriquecidos.length > 0) {
        buscarDadosEnderecoAutomatico(pedidosEnriquecidos);
      }
    } catch (error: unknown) {
      console.error('[CicloPedidos] Erro ao carregar pedidos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar pedidos';
      setError(`Erro ao carregar pedidos: ${errorMessage}`);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    carregarPedidos();
  };

  const handleFiltroPeriodoChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFiltroPeriodo(value);
    
    // Atualizar datas para corresponder ao período selecionado
    const hoje = new Date();
    if (value === 'hoje') {
      const hojeFormatado = format(hoje, 'yyyy-MM-dd');
      setDataInicio(hojeFormatado);
      setDataFim(hojeFormatado);
    } else if (value === 'ontem') {
      const ontemFormatado = format(subDays(hoje, 1), 'yyyy-MM-dd');
      setDataInicio(ontemFormatado);
      setDataFim(ontemFormatado);
    } else if (value === 'semana') {
      setDataInicio(format(subDays(hoje, 7), 'yyyy-MM-dd'));
      setDataFim(format(hoje, 'yyyy-MM-dd'));
    } else if (value === 'mes') {
      const primeiroDiaMes = format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd');
      setDataInicio(primeiroDiaMes);
      setDataFim(format(hoje, 'yyyy-MM-dd'));
    }
  };

  const handleFiltroEntregaChange = (event: SelectChangeEvent) => {
    setFiltroEntrega(event.target.value);
  };

  const aplicarFiltros = () => {
    console.log('[CicloPedidos] Aplicando filtros:', {
      filtroPeriodo,
      filtroEntrega,
      dataInicio,
      dataFim,
      searchTerm
    });
    
    // Se for filtro personalizado, garantir que temos datas válidas
    if (filtroPeriodo === 'personalizado') {
      if (!dataInicio || !dataFim) {
        enqueueSnackbar('Por favor, selecione as datas de início e fim para o filtro personalizado', { variant: 'warning' });
        return;
      }
      
      // Validar se data início é menor ou igual à data fim
      const dataInicioDate = new Date(dataInicio);
      const dataFimDate = new Date(dataFim);
      
      if (dataInicioDate > dataFimDate) {
        enqueueSnackbar('A data de início deve ser menor ou igual à data de fim', { variant: 'warning' });
        return;
      }
      
      console.log('[CicloPedidos] Aplicando filtro personalizado:', { dataInicio, dataFim });
    }
    
    // Log do período atual para debug
    const periodo = getPeriodoConfig();
    console.log('[CicloPedidos] Período configurado:', periodo);
    
    setPaginaAtual(1); // Resetar para primeira página
    carregarPedidos();
    setOpenFiltros(false);
  };

  // Função para buscar detalhes do pedido (bairro e cidade)
  const buscarDadosEnderecoAutomatico = async (pedidos: Pedido[]) => {
    // Buscar dados de endereço para pedidos que não têm os campos de bairro/cidade
    const pedidosParaBuscar = pedidos.filter(p => 
      !detalhesPedido[p.ORCAMENTO_ID.toString()] && 
      p.TIPO_ENTREGA !== 'NDF' && 
      p.TIPO_ENTREGA !== 'ATO'
    );

    if (pedidosParaBuscar.length === 0) return;

    try {
      // Buscar apurações com os dados de endereço
      const periodo = getPeriodoConfig();
      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      if (periodo.inicio) apuracoesUrl.searchParams.set('data_inicio', periodo.inicio);
      if (periodo.fim) apuracoesUrl.searchParams.set('data_fim', periodo.fim);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        let apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        let cadastroApuracoesMap = new Map<number, ApuracaoItem>(
          (apuracoesData.data || [])
            .map((a) => {
              const id = getCadastroIdFromApuracao(a);
              return id !== null ? [id, a] : null;
            })
            .filter((entry): entry is [number, ApuracaoItem] => entry !== null)
        );
        if (apuracoesMap.size === 0 && (periodo.inicio || periodo.fim)) {
          const apuracoesFallbackUrl = new URL('/api/apuracoes', window.location.origin);
          apuracoesFallbackUrl.searchParams.set('limit', '10000');
          apuracoesFallbackUrl.searchParams.set('offset', '0');
          const apuracoesFallbackResponse = await fetch(apuracoesFallbackUrl.toString(), {
            headers: { accept: 'application/json' }
          });
          if (apuracoesFallbackResponse.ok) {
            const apuracoesFallbackData: ApuracoesResponse = await apuracoesFallbackResponse.json();
            apuracoesMap = buildApuracoesMap(apuracoesFallbackData.data || []);
            cadastroApuracoesMap = new Map<number, ApuracaoItem>(
              (apuracoesFallbackData.data || [])
                .map((a) => {
                  const id = getCadastroIdFromApuracao(a);
                  return id !== null ? [id, a] : null;
                })
                .filter((entry): entry is [number, ApuracaoItem] => entry !== null)
            );
          }
        }

        const novosDetalhes: Record<string, { bairro: string; cidade: string; estado?: string }> = {};
        pedidosParaBuscar.forEach(p => {
          const apuracao = apuracoesMap.get(p.ORCAMENTO_ID) || cadastroApuracoesMap.get(p.CADASTRO_ID);
          novosDetalhes[p.ORCAMENTO_ID.toString()] = {
            bairro: (apuracao as any)?.NOME_BAIRRO_NOTA ?? 'Não informado',
            cidade: (apuracao as any)?.NOME_CIDADE ?? 'Não informado',
            estado: (apuracao as any)?.ESTADO_DESTINO ?? 'Não informado'
          };
        });

        if (Object.keys(novosDetalhes).length > 0) {
          setDetalhesPedido(prev => ({ ...prev, ...novosDetalhes }));
        }
      }
    } catch (error) {
      console.error('[CicloPedidos] Erro ao buscar dados de endereço automaticamente:', error);
    }
  };

  const abrirDetalhesModal = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setOpenDetalhesModal(true);
  };

  const fecharDetalhesModal = () => {
    setOpenDetalhesModal(false);
    setPedidoSelecionado(null);
  };

  const buscarDetalhesPedido = async (pedidoId: string) => {
    if (detalhesPedido[pedidoId] || carregandoDetalhes[pedidoId]) {
      return; // Já temos os detalhes ou estamos carregando
    }

    setCarregandoDetalhes(prev => ({ ...prev, [pedidoId]: true }));

    try {
      const url = `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/apuracoes?limit=10&offset=0`;
      console.log(`[CicloPedidos] Buscando detalhes do pedido ${pedidoId}:`, url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[CicloPedidos] Resposta da API de apurações:`, data);

      // Procurar o pedido específico na resposta
      if (data.results && Array.isArray(data.results)) {
        const apuracao = data.results.find((item: any) => 
          item.pedido_id === pedidoId || item.orcamento_id === pedidoId
        );

        if (apuracao) {
          setDetalhesPedido(prev => ({
            ...prev,
            [pedidoId]: {
              bairro: apuracao.bairro || 'Não informado',
              cidade: apuracao.cidade || 'Não informado'
            }
          }));
        } else {
          console.warn(`[CicloPedidos] Pedido ${pedidoId} não encontrado na resposta`);
          setDetalhesPedido(prev => ({
            ...prev,
            [pedidoId]: {
              bairro: 'Não encontrado',
              cidade: 'Não encontrado'
            }
          }));
        }
      } else {
        console.warn('[CicloPedidos] Resposta da API não contém results array');
        setDetalhesPedido(prev => ({
          ...prev,
          [pedidoId]: {
            bairro: 'Dados não disponíveis',
            cidade: 'Dados não disponíveis'
          }
        }));
      }
    } catch (error) {
      console.error(`[CicloPedidos] Erro ao buscar detalhes do pedido ${pedidoId}:`, error);
      enqueueSnackbar(`Erro ao buscar detalhes do pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { variant: 'error' });
    } finally {
      setCarregandoDetalhes(prev => ({ ...prev, [pedidoId]: false }));
    }
  };

  const limparFiltros = () => {
    setFiltroPeriodo('hoje');
    setFiltroEntrega('entrega_fechados');
    setSearchTerm('');
    setDataInicio(format(new Date(), 'yyyy-MM-dd'));
    setDataFim(format(new Date(), 'yyyy-MM-dd'));
    setPaginaAtual(1);
    carregarPedidos();
  };

  const getStatusEntrega = (tipoEntrega: string) => {
    switch (tipoEntrega) {
      case 'EPG':
      case 'ENT':
        return { label: 'Entrega', color: 'success' as const };
      case 'NDF':
      case 'ATO':
        return { label: 'Não Entrega', color: 'default' as const };
      default:
        return { label: tipoEntrega, color: 'info' as const };
    }
  };

  const formatarData = (dataString: string | null) => {
    if (!dataString) return '-';
    
    try {
      // Tenta diferentes formatos de data
      let data: Date;
      
      // Se for um número (timestamp em milissegundos)
      if (!isNaN(Number(dataString)) && dataString.length > 8) {
        data = new Date(Number(dataString));
      } 
      // Se for string no formato ISO (2024-01-15T10:30:00)
      else if (dataString.includes('T') && dataString.includes('-')) {
        data = new Date(dataString);
      }
      // Se for string no formato YYYY-MM-DD ou YYYY/MM/DD
      else if (dataString.match(/^\d{4}[-/]\d{2}[-/]\d{2}/)) {
        const [ano, mes, dia] = dataString.split(/[-\/]/);
        data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      }
      // Se for string no formato DD/MM/YYYY ou DD-MM-YYYY
      else if (dataString.match(/^\d{2}[-/]\d{2}[-/]\d{4}/)) {
        const [dia, mes, ano] = dataString.split(/[-\/]/);
        data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      }
      // Se for timestamp em segundos (não milissegundos)
      else if (!isNaN(Number(dataString)) && dataString.length <= 10) {
        data = new Date(Number(dataString) * 1000);
      }
      // Outros formatos - tenta direto
      else {
        data = new Date(dataString);
      }
      
      // Verifica se a data é válida
      if (isNaN(data.getTime())) {
        console.warn('Data inválida:', dataString);
        return dataString; // Retorna original se não conseguir parse
      }
      
      // Verifica se a data é muito antiga ou muito futura (indica parse errado)
      const ano = data.getFullYear();
      if (ano < 2000 || ano > 2050) {
        console.warn('Data com ano suspeito:', dataString, '->', ano);
        return dataString;
      }
      
      return format(data, "dd/MM/yy HH:mm", { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', dataString, error);
      return dataString;
    }
  };

  const formatarEndereco = (logradouro: string | null, bairroId: number | null, cep: string | null) => {
    if (!logradouro && !bairroId && !cep) return '-';
    const partes = [];
    if (logradouro) partes.push(logradouro);
    if (bairroId) partes.push(`Bairro: ${bairroId}`);
    if (cep) partes.push(`CEP: ${cep}`);
    return partes.join(' - ');
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  

  const exportarPDF = async (escopo: 'current' | 'all' = 'current') => {
    try {
      let dadosParaExportar = filteredPedidos;
      
      if (escopo === 'all') {
        // Carregar todos os pedidos para exportação
        setLoading(true);
        let url = `/api/pedidos/externos?limit=10000&offset=0`;
        const periodoFiltro = getPeriodoConfig();
        if (periodoFiltro.inicio && periodoFiltro.fim) {
          url += `&data_inicio=${periodoFiltro.inicio}&data_fim=${periodoFiltro.fim}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data: PedidosResponse = await response.json();
          dadosParaExportar = data.data.filter(p => {
            const searchMatch = 
              (p.CLIENTE_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.NOME_FANTASIA || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.VENDEDOR_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.ORCAMENTO_ID.toString().includes(searchTerm);
            
            let entregaMatch = true;
            if (filtroEntrega === 'entrega_fechados') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO' && p.PEDIDO_FECHADO === 'S';
            } else if (filtroEntrega === 'entrega') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
            } else if (filtroEntrega === 'nao_entrega') {
              entregaMatch = p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO';
            } else if (filtroEntrega === 'todos') {
              entregaMatch = true;
            }
            
            return searchMatch && entregaMatch;
          });
        }
        setLoading(false);
      }

      const periodo = getPeriodoConfig();
      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      if (periodo.inicio) apuracoesUrl.searchParams.set('data_inicio', periodo.inicio);
      if (periodo.fim) apuracoesUrl.searchParams.set('data_fim', periodo.fim);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        let apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        if (apuracoesMap.size === 0 && (periodo.inicio || periodo.fim)) {
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
        dadosParaExportar = dadosParaExportar.map((p) => {
          const apuracao = apuracoesMap.get(p.ORCAMENTO_ID);
          if (!apuracao) return p;
          return { ...p, NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null };
        });
      }
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { width } = page.getSize();
      let y = 800;
      const fontSize = 10;
      const lineHeight = 15;
      
      // Título
      page.drawText('Relatório de Pedidos', {
        x: 50,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 30;
      
      page.drawText(`Período: ${periodo.inicio} a ${periodo.fim}`, {
        x: 50,
        y,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= 20;
      
      // Escopo
      page.drawText(`Escopo: ${escopo === 'all' ? 'Todos os pedidos' : `Página ${paginaAtual}`}`, {
        x: 50,
        y,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= 30;
      
      // Cabeçalho da tabela
      const headers = ['Nº Pedido', 'Nº Nota', 'Cliente', 'Fantasia', 'Data Recebimento', 'Endereço', 'CEP', 'Valor', 'Entrega', 'Vendedor', 'Status'];
      const colWidths = [50, 45, 75, 55, 75, 75, 50, 50, 45, 55, 40];
      
      let x = 50;
      headers.forEach((header, index) => {
        page.drawText(header, {
          x,
          y,
          size: fontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        x += colWidths[index];
      });
      y -= lineHeight * 2;
      
      // Dados
      dadosParaExportar.forEach((pedido) => {
        if (y < 50) {
          // Nova página
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        
        x = 50;
        const rowData = [
          pedido.ORCAMENTO_ID.toString(),
          (pedido.NUMERO_NOTA || '').toString().substring(0, 10),
          (pedido.CLIENTE_NOME || '').substring(0, 12),
          (pedido.NOME_FANTASIA || '').substring(0, 10),
          formatarData(pedido.DATA_HORA_RECEBIMENTO),
          (pedido.LOGRADOURO_ENTREGA || '').substring(0, 12),
          (pedido.CEP_ENTREGA || ''),
          formatarValor(pedido.VALOR_PEDIDO),
          getStatusEntrega(pedido.TIPO_ENTREGA).label,
          (pedido.VENDEDOR_NOME || '').substring(0, 10),
          pedido.PEDIDO_FECHADO === 'S' ? 'Fechado' : 'Aberto'
        ];
        
        rowData.forEach((data, index) => {
          page.drawText(data, {
            x,
            y,
            size: fontSize - 1,
            font: font,
            color: rgb(0, 0, 0),
          });
          x += colWidths[index];
        });
        y -= lineHeight;
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos_${escopo === 'all' ? 'todos' : `pagina_${paginaAtual}`}_${dataInicio}_${dataFim}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      enqueueSnackbar(`PDF (${escopo === 'all' ? 'todos' : 'página atual'}) exportado com sucesso!`, { variant: 'success' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      enqueueSnackbar('Erro ao exportar PDF', { variant: 'error' });
    }
  };

  const exportarExcel = async (escopo: 'current' | 'all' = 'current') => {
    try {
      let dadosParaExportar = filteredPedidos;
      
      if (escopo === 'all') {
        // Carregar todos os pedidos para exportação
        setLoading(true);
        let url = `/api/pedidos/externos?limit=10000&offset=0`;
        const periodoFiltro = getPeriodoConfig();
        if (periodoFiltro.inicio && periodoFiltro.fim) {
          url += `&data_inicio=${periodoFiltro.inicio}&data_fim=${periodoFiltro.fim}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data: PedidosResponse = await response.json();
          dadosParaExportar = data.data.filter(p => {
            const searchMatch = 
              (p.CLIENTE_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.NOME_FANTASIA || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.VENDEDOR_NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.ORCAMENTO_ID.toString().includes(searchTerm);
            
            let entregaMatch = true;
            if (filtroEntrega === 'entrega_fechados') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO' && p.PEDIDO_FECHADO === 'S';
            } else if (filtroEntrega === 'entrega') {
              entregaMatch = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
            } else if (filtroEntrega === 'nao_entrega') {
              entregaMatch = p.TIPO_ENTREGA === 'NDF' || p.TIPO_ENTREGA === 'ATO';
            } else if (filtroEntrega === 'todos') {
              entregaMatch = true;
            }
            
            return searchMatch && entregaMatch;
          });
        }
        setLoading(false);
      }

      const periodo = getPeriodoConfig();
      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '10000');
      apuracoesUrl.searchParams.set('offset', '0');
      if (periodo.inicio) apuracoesUrl.searchParams.set('data_inicio', periodo.inicio);
      if (periodo.fim) apuracoesUrl.searchParams.set('data_fim', periodo.fim);

      const apuracoesResponse = await fetch(apuracoesUrl.toString(), {
        headers: { accept: 'application/json' }
      });

      if (apuracoesResponse.ok) {
        const apuracoesData: ApuracoesResponse = await apuracoesResponse.json();
        let apuracoesMap = buildApuracoesMap(apuracoesData.data || []);
        if (apuracoesMap.size === 0 && (periodo.inicio || periodo.fim)) {
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
        dadosParaExportar = dadosParaExportar.map((p) => {
          const apuracao = apuracoesMap.get(p.ORCAMENTO_ID);
          if (!apuracao) return p;
          return { ...p, NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null };
        });
      }
      
      const dados = dadosParaExportar.map(pedido => ({
        'Nº Pedido': pedido.ORCAMENTO_ID,
        'Nº Nota': pedido.NUMERO_NOTA || '',
        'Cliente': pedido.CLIENTE_NOME || '',
        'Fantasia': pedido.NOME_FANTASIA || '',
        'Data Cadastro': formatarData(pedido.DATA_HORA_CADASTRO),
        'Data Recebimento': formatarData(pedido.DATA_HORA_RECEBIMENTO),
        'Endereço': pedido.LOGRADOURO_ENTREGA || '',
        'Bairro ID': pedido.BAIRRO_ENTREGA_ID || '',
        'CEP Entrega': pedido.CEP_ENTREGA || '',
        'CEP Consumidor Final': pedido.CEP_CONS_FINAL || '',
        'Valor Pedido': pedido.VALOR_PEDIDO,
        'Tipo Entrega': pedido.TIPO_ENTREGA,
        'Vendedor': pedido.VENDEDOR_NOME || '',
        'Cadastro ID': pedido.CADASTRO_ID,
        'Pedido Fechado': pedido.PEDIDO_FECHADO,
        'Cancelado': pedido.CANCELADO,
        'Data Entrega': formatarData(pedido.DATA_ENTREGA),
        'Separado para Recebimento': pedido.SEPARADO_PARA_RECEBIMENTO,
        'Entrega por Transportadora': pedido.ENTREGA_POR_TRANSPORTADORA
      }));
      
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 10 }, // Nº Pedido
        { wch: 10 }, // Nº Nota
        { wch: 30 }, // Cliente
        { wch: 25 }, // Fantasia
        { wch: 20 }, // Data Cadastro
        { wch: 20 }, // Data Recebimento
        { wch: 35 }, // Endereço
        { wch: 12 }, // Bairro ID
        { wch: 12 }, // CEP Entrega
        { wch: 15 }, // CEP Consumidor Final
        { wch: 12 }, // Valor Pedido
        { wch: 15 }, // Tipo Entrega
        { wch: 25 }, // Vendedor
        { wch: 12 }, // Cadastro ID
        { wch: 15 }, // Pedido Fechado
        { wch: 10 }, // Cancelado
        { wch: 20 }, // Data Entrega
        { wch: 25 }, // Separado para Recebimento
        { wch: 25 }  // Entrega por Transportadora
      ];
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, `pedidos_${escopo === 'all' ? 'todos' : `pagina_${paginaAtual}`}_${dataInicio}_${dataFim}.xlsx`);
      
      enqueueSnackbar(`Excel (${escopo === 'all' ? 'todos' : 'página atual'}) exportado com sucesso!`, { variant: 'success' });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      enqueueSnackbar('Erro ao exportar Excel', { variant: 'error' });
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
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.info.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.3)}`
            }}
          >
            <ReceiptIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Ciclo do Pedido
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body1" color="text.secondary">
                Visualize e gerencie todos os pedidos do sistema.
              </Typography>
              <Chip 
                label={`Total: ${filteredPedidos.length} pedidos`} 
                color="primary" 
                variant="outlined" 
                size="small" 
                sx={{ fontWeight: 'bold' }} 
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Aplicar filtros">
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setOpenFiltros(true)}
                sx={{
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    background: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                Filtros
              </Button>
            </Tooltip>
            <Tooltip title="Atualizar lista">
              <IconButton
                onClick={handleRefresh}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Pedidos Hoje (Entregas)" 
            value={stats.hoje} 
            icon={<CheckCircleIcon sx={{ fontSize: 30 }} />}
            color="success"
            loading={stats.loading}
            delay={0.1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Pedidos Mês (Entregas)" 
            value={stats.mes} 
            icon={<CalendarMonthIcon sx={{ fontSize: 30 }} />}
            color="info"
            loading={stats.loading}
            delay={0.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Valor Total Hoje (Entregas)" 
            value={`R$ ${stats.valorHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={<TrendingUpIcon sx={{ fontSize: 30 }} />}
            color="primary"
            loading={stats.loading}
            delay={0.3}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Valor Total Mês (Entregas)" 
            value={`R$ ${stats.valorMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={<ArticleIcon sx={{ fontSize: 30 }} />}
            color="warning"
            loading={stats.loading}
            delay={0.4}
          />
        </Grid>
      </Grid>

      {/* Search Section */}
      <MotionPaper
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        sx={{
          p: 2,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <TextField
          fullWidth
          placeholder="Buscar pedido por cliente, fantasia, vendedor ou número..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: alpha(theme.palette.background.paper, 0.8),
              '&:hover fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
        />
      </MotionPaper>

      {/* Filtros por Tipo de Entrega */}
      <MotionPaper
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        sx={{
          p: 2,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600} color="primary.main">
            Filtrar por Tipo de Entrega
          </Typography>
          <ToggleButtonGroup
            value={filtroEntrega}
            exclusive
            onChange={(event, value) => {
              if (value !== null) {
                setFiltroEntrega(value);
              }
            }}
            aria-label="tipo de entrega"
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <ToggleButton value="entrega_fechados" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography variant="body2">Entrega e Fechados</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="entrega" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocalShippingIcon fontSize="small" color="primary" />
                <Typography variant="body2">Somente Entrega</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="nao_entrega" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CancelIcon fontSize="small" color="error" />
                <Typography variant="body2">Não Entrega</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="todos" sx={{ borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="body2">Todos</Typography>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              Período: {getPeriodoConfig().label}
            </Typography>
            <Button 
              size="small" 
              onClick={limparFiltros}
              startIcon={<RefreshIcon />}
            >
              Limpar filtros
            </Button>
          </Stack>
        </Stack>
      </MotionPaper>

      {/* Dialog de Filtros */}
      <Dialog open={openFiltros} onClose={() => setOpenFiltros(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterListIcon />
            <Typography variant="h6">Filtros Avançados</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select
                value={filtroPeriodo}
                label="Período"
                onChange={handleFiltroPeriodoChange}
              >
                <MenuItem value="hoje">Hoje</MenuItem>
                <MenuItem value="ontem">Ontem</MenuItem>
                <MenuItem value="semana">Última semana</MenuItem>
                <MenuItem value="mes">Este mês</MenuItem>
                <MenuItem value="personalizado">Personalizado</MenuItem>
              </Select>
            </FormControl>
            
            {filtroPeriodo === 'personalizado' && (
              <Stack direction="row" spacing={2}>
                <TextField
                  type="date"
                  label="Data Início"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setFiltroPeriodo('personalizado');
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="date"
                  label="Data Fim"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setFiltroPeriodo('personalizado');
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
            )}
            
            <FormControl fullWidth>
              <InputLabel>Tipo de Entrega</InputLabel>
              <Select
                value={filtroEntrega}
                label="Tipo de Entrega"
                onChange={handleFiltroEntregaChange}
              >
                <MenuItem value="entrega_fechados">Entrega e Fechados (Padrão)</MenuItem>
                <MenuItem value="entrega">Somente entrega</MenuItem>
                <MenuItem value="nao_entrega">Não entrega</MenuItem>
                <MenuItem value="todos">Todos</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFiltros(false)}>Cancelar</Button>
          <Button onClick={aplicarFiltros} variant="contained">Aplicar Filtros</Button>
        </DialogActions>
      </Dialog>

      {/* Tabela de Pedidos */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
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
                maxHeight: '65vh',
                overflowX: 'auto',
                overflowY: 'auto',
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                borderRadius: '8px',
                '& .MuiTableCell-root': {
                  whiteSpace: 'nowrap',
                  px: 1.5
                },
                // Custom scrollbar styling for better visibility
                '&::-webkit-scrollbar': {
                  width: '10px',
                  height: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: alpha(theme.palette.common.black, 0.05),
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.4),
                  borderRadius: '10px',
                  border: '2px solid transparent',
                  backgroundClip: 'content-box',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.6),
                  }
                }
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Nº Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Nº Nota</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Data/Hora Recebimento</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Endereço</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>CEP</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Valor</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Entrega</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Vendedor</TableCell>
                    {/* <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Status</TableCell> */}
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem', py: 1 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          Nenhum pedido encontrado com os filtros atuais.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPedidos.map((pedido, index) => {
                      const statusEntrega = getStatusEntrega(pedido.TIPO_ENTREGA);
                      
                      return (
                        <MotionTableRow
                          key={pedido.ORCAMENTO_ID}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          hover
                          sx={{
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
                            <Box>
                              <Typography variant="body2">
                                {pedido.LOGRADOURO_ENTREGA || '-'}
                              </Typography>
                              {detalhesPedido[pedido.ORCAMENTO_ID.toString()] ? (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {detalhesPedido[pedido.ORCAMENTO_ID.toString()].bairro}, {detalhesPedido[pedido.ORCAMENTO_ID.toString()].cidade}
                                  {detalhesPedido[pedido.ORCAMENTO_ID.toString()].estado && ` - ${detalhesPedido[pedido.ORCAMENTO_ID.toString()].estado}`}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Buscando endereço...
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {pedido.CEP_ENTREGA || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatarValor(pedido.VALOR_PEDIDO)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusEntrega.label}
                              size="small"
                              color={statusEntrega.color}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '24px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {pedido.VENDEDOR_NOME || '-'}
                            </Typography>
                          </TableCell>
                          {/* <TableCell>
                            <Chip
                              label={statusPedido.label}
                              size="small"
                              color={statusPedido.color}
                              icon={statusPedido.icon}
                              sx={{ fontSize: '0.7rem', height: '24px' }}
                            />
                          </TableCell> */}
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => abrirDetalhesModal(pedido)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                minWidth: 'auto'
                              }}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </MotionTableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Footer com estatísticas e paginação */}
            <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {filteredPedidos.length} pedidos (Página {paginaAtual} de {totalPaginas})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<PdfIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setExportType('pdf');
                      setOpenExportDialog(true);
                    }}
                    disabled={filteredPedidos.length === 0}
                  >
                    PDF
                  </Button>
                  <Button
                    startIcon={<ExcelIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setExportType('excel');
                      setOpenExportDialog(true);
                    }}
                    disabled={filteredPedidos.length === 0}
                  >
                    Excel
                  </Button>
                </Stack>
              </Stack>
              
              {/* Paginação */}
              {totalPaginas > 1 && (
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
                  <IconButton
                    onClick={() => setPaginaAtual(1)}
                    disabled={paginaAtual === 1}
                    size="small"
                  >
                    <FirstPageIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setPaginaAtual(paginaAtual - 1)}
                    disabled={paginaAtual === 1}
                    size="small"
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  
                  <Typography variant="body2" sx={{ mx: 2 }}>
                    Página {paginaAtual} de {totalPaginas}
                  </Typography>
                  
                  <IconButton
                    onClick={() => setPaginaAtual(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas}
                    size="small"
                  >
                    <ChevronRightIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setPaginaAtual(totalPaginas)}
                    disabled={paginaAtual === totalPaginas}
                    size="small"
                  >
                    <LastPageIcon />
                  </IconButton>
                </Stack>
              )}
            </Box>
          </>
        )}
      </MotionPaper>

      

      {/* Dialog de Exportação */}
      <Dialog open={openExportDialog} onClose={() => setOpenExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DownloadIcon />
            <Typography variant="h6">Exportar {exportType === 'pdf' ? 'PDF' : 'Excel'}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Escolha o escopo da exportação:
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as 'current' | 'all')}
              >
                <FormControlLabel 
                  value="current" 
                  control={<Radio />} 
                  label={`Página atual (${filteredPedidos.length} pedidos)`} 
                />
                <FormControlLabel 
                  value="all" 
                  control={<Radio />} 
                  label={`Todos os pedidos filtrados`} 
                />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExportDialog(false)}>Cancelar</Button>
          <Button 
            onClick={() => {
              if (exportType === 'pdf') {
                exportarPDF(exportScope);
              } else {
                exportarExcel(exportScope);
              }
              setOpenExportDialog(false);
            }} 
            variant="contained"
          >
            Exportar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Detalhes do Pedido */}
      <Dialog
        open={openDetalhesModal}
        onClose={fecharDetalhesModal}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ReceiptIcon />
            <Typography variant="h6" component="span">
              Detalhes do Pedido #{pedidoSelecionado?.ORCAMENTO_ID}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {pedidoSelecionado && (
            <Grid container spacing={2}>
              {/* Informações Básicas */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Informações Básicas
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Número do Pedido
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.ORCAMENTO_ID}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Data do Pedido
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {format(new Date(pedidoSelecionado.DATA_HORA_CADASTRO), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip 
                          label={pedidoSelecionado.PEDIDO_FECHADO === 'S' ? 'Fechado' : 'Aberto'}
                          color={pedidoSelecionado.PEDIDO_FECHADO === 'S' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Cancelado
                        </Typography>
                        <Chip 
                          label={pedidoSelecionado.CANCELADO === 'S' ? 'Sim' : 'Não'}
                          color={pedidoSelecionado.CANCELADO === 'S' ? 'error' : 'success'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cliente */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Cliente
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Nome do Cliente
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.CLIENTE_NOME}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Nome Fantasia
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.NOME_FANTASIA || 'Não informado'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Endereço de Entrega */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Endereço de Entrega
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Logradouro
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.LOGRADOURO_ENTREGA || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Bairro
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {detalhesPedido[pedidoSelecionado.ORCAMENTO_ID.toString()]?.bairro || 'Buscando...'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Cidade
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {detalhesPedido[pedidoSelecionado.ORCAMENTO_ID.toString()]?.cidade || 'Buscando...'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Estado
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {detalhesPedido[pedidoSelecionado.ORCAMENTO_ID.toString()]?.estado || 'Buscando...'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          CEP Entrega
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.CEP_ENTREGA || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          CEP Consumidor Final
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.CEP_CONS_FINAL || 'Não informado'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Informações do Pedido */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Informações do Pedido
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Valor do Pedido
                        </Typography>
                        <Typography variant="body1" fontWeight="medium" color="success.main">
                          R$ {pedidoSelecionado.VALOR_PEDIDO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Tipo de Entrega
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.TIPO_ENTREGA}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Vendedor
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.VENDEDOR_NOME}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Número da Nota
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.NUMERO_NOTA || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Data de Entrega
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {pedidoSelecionado.DATA_ENTREGA ? format(new Date(pedidoSelecionado.DATA_ENTREGA), 'dd/MM/yyyy') : 'Não informada'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Separado para Recebimento
                        </Typography>
                        <Chip 
                          label={pedidoSelecionado.SEPARADO_PARA_RECEBIMENTO === 'S' ? 'Sim' : 'Não'}
                          color={pedidoSelecionado.SEPARADO_PARA_RECEBIMENTO === 'S' ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Entrega por Transportadora
                        </Typography>
                        <Chip 
                          label={pedidoSelecionado.ENTREGA_POR_TRANSPORTADORA === 'S' ? 'Sim' : 'Não'}
                          color={pedidoSelecionado.ENTREGA_POR_TRANSPORTADORA === 'S' ? 'info' : 'default'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={fecharDetalhesModal}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

const CicloPedidosPage: NextPage = () => {
  return (
    <AdminRoute>
      <Head>
        <title>Ciclo do Pedido - Sistema de Controle de Carga</title>
        <meta name="description" content="Visualize e gerencie todos os pedidos do sistema" />
      </Head>
      <VisualPageLayout
        title="Ciclo do Pedido"
        subtitle="Visualize e gerencie todos os pedidos do sistema"
      >
        <CicloPedidosContent />
      </VisualPageLayout>
    </AdminRoute>
  );
};

export default CicloPedidosPage;
