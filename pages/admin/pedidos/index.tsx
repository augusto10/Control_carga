import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Calendar,
  Truck,
  User,
  Building2,
  Receipt,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Pedido {
  ORCAMENTO_ID: number;
  CLIENTE_NOME: string;
  NOME_FANTASIA: string;
  DATA_HORA_CADASTRO: string;
  DATA_HORA_RECEBIMENTO: string | null;
  LOGRADOURO_ENTREGA: string | null;
  COMPLEMENTO_ENTREGA: string | null;
  BAIRRO_ENTREGA_ID: number | null;
  CEP_ENTREGA: string | null;
  CEP_CONS_FINAL: string | null;
  CEP?: string | null;
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
  IDENTIFICACAO_NFE?: string | null;
  NOME_BAIRRO_NOTA?: string | null;
  NOME_CIDADE?: string | null;
  ESTADO_DESTINO?: string | null;
  EMPRESA_ID?: number | string;
  [key: string]: any;
}

(CicloPedidoPage as any).usesAppLayout = true;
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
  CNPJ_CPF?: string | number;
  CNPJ?: string | number;
  CPF?: string | number;
  NOME_BAIRRO_NOTA?: string;
  NOME_CIDADE?: string;
  ESTADO_DESTINO?: string;
  LOGRADOURO?: string;
  COMPLEMENTO?: string;
  CEP?: string;
  BAIRRO?: string;
  CIDADE?: string;
  UF?: string;
  [key: string]: any;
}

interface ApuracoesResponse {
  total: number;
  limit: number;
  offset: number;
  data: ApuracaoItem[];
}

const parseValorNumero = (v: any) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

const pickString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

const getNumeroNota = (p: Pedido) => {
  const pAny = p as any;
  return pickString(
    p.NUMERO_NOTA,
    pAny.NUMERO_NOTA_FISCAL,
    pAny.NOTA_FISCAL_NUMERO,
    pAny.NOTAFISCAL_NUMERO,
    pAny.NF_NUMERO,
    pAny.NF,
    pAny.NUMERO_NF,
    pAny.NUMERO_NOTA_FISCAL,
    pAny.NOTA_FISCAL,
    pAny.NF_NUMERO,
    pAny.NUMERO_NF,
    p.IDENTIFICACAO_NFE,
    pAny.CHAVE_NFE,
    pAny.IDENTIFICACAO,
    pAny.NUMERO,
    pAny.NUMERO_NOTA
  );
};

const getEnderecoResumo = (p: Pedido) => {
  const pAny = p as any;
  const cliente = pAny?.CLIENTE ?? pAny?.cliente ?? null;
  const logradouro = pickString(
    p.LOGRADOURO_ENTREGA,
    pAny.LOGRADOURO,
    pAny.RUA,
    pAny.ENDERECO,
    pAny.ENDERECO_ENTREGA,
    pAny.ENDERECO_COMPLETO,
    cliente?.ENDERECO,
    cliente?.endereco
  );
  const numero = pickString(
    pAny.NUMERO,
    pAny.NUMERO_ENDERECO,
    pAny.NUMERO_ENTREGA
  );
  const complemento = pickString(
    p.COMPLEMENTO_ENTREGA,
    pAny.COMPLEMENTO,
    pAny.COMPLEMENTO_ENTREGA
  );
  const bairro = pickString(
    p.NOME_BAIRRO_NOTA,
    pAny.NOME_BAIRRO_NOTA,
    pAny.BAIRRO,
    pAny.bairro,
    pAny.NOME_BAIRRO,
    pAny.BAIRRO_ENTREGA,
    cliente?.BAIRRO,
    cliente?.bairro
  );
  const cidade = pickString(
    p.NOME_CIDADE,
    pAny.CIDADE,
    pAny.cidade,
    pAny.CIDADE_ENTREGA,
    pAny.MUNICIPIO,
    cliente?.CIDADE,
    cliente?.cidade
  );
  const uf = pickString(
    p.ESTADO_DESTINO,
    pAny.UF,
    pAny.uf,
    pAny.UF_ENTREGA,
    pAny.ESTADO,
    cliente?.ESTADO,
    cliente?.estado,
    cliente?.UF,
    cliente?.uf
  );
  const cep = pickString(
    (p as any).CEP,
    p.CEP_ENTREGA,
    p.CEP_CONS_FINAL,
    pAny.CEP_ENTREGA,
    cliente?.CEP,
    cliente?.cep
  );
  const cidadeUf = [cidade, uf].filter(Boolean).join('/');
  return [logradouro, numero, complemento, bairro, cep, cidadeUf].filter(Boolean).join(', ');
};

const getCnpjPedido = (p: Pedido) => {
  const pAny = p as any;
  const cliente = pAny?.CLIENTE ?? pAny?.cliente ?? null;
  return pickString(
    pAny.CNPJ,
    pAny.cnpj,
    pAny.CNPJ_CPF,
    pAny.cnpj_cpf,
    pAny.CPF,
    pAny.cpf,
    cliente?.CNPJ,
    cliente?.CPF,
    cliente?.CNPJ_CPF,
    cliente?.cnpj,
    cliente?.cpf,
    cliente?.cnpj_cpf
  );
};

const getIdentificacaoNfeReduzida = (codigo?: string | null) => {
  if (!codigo) return null;
  const codigoLimpo = String(codigo).replace(/[^\d]/g, '');
  if (!codigoLimpo) return null;
  if (codigoLimpo.length === 44) {
    return codigoLimpo.substring(25, 34).replace(/^0+/, '');
  }
  if (codigoLimpo.length > 44) {
    for (let i = 0; i <= codigoLimpo.length - 44; i++) {
      const bloco = codigoLimpo.substring(i, i + 44);
      if (['8', '9'].includes(bloco[0])) {
        return bloco.substring(25, 34).replace(/^0+/, '');
      }
    }
  }
  if (codigo.includes('-')) {
    const partes = codigo.split('-');
    return (partes[1] ? partes[1].replace(/[^\d]/g, '') : '').replace(/^0+/, '');
  }
  if (codigoLimpo.length <= 20) {
    return codigoLimpo.replace(/^0+/, '');
  }
  return codigoLimpo.slice(-9).replace(/^0+/, '');
};

const getEnderecoCampos = (p: Pedido) => {
  const pAny = p as any;
  const cliente = pAny?.CLIENTE ?? pAny?.cliente ?? null;
  const logradouro = pickString(
    p.LOGRADOURO_ENTREGA,
    pAny.LOGRADOURO,
    pAny.RUA,
    pAny.ENDERECO,
    pAny.ENDERECO_ENTREGA,
    pAny.ENDERECO_COMPLETO,
    cliente?.ENDERECO,
    cliente?.endereco
  );
  const numero = pickString(
    pAny.NUMERO,
    pAny.NUMERO_ENDERECO,
    pAny.NUMERO_ENTREGA
  );
  const complemento = pickString(
    p.COMPLEMENTO_ENTREGA,
    pAny.COMPLEMENTO,
    pAny.COMPLEMENTO_ENTREGA
  );
  const bairro = pickString(
    p.NOME_BAIRRO_NOTA,
    pAny.NOME_BAIRRO_NOTA,
    pAny.BAIRRO,
    pAny.bairro,
    pAny.NOME_BAIRRO,
    pAny.BAIRRO_ENTREGA,
    cliente?.BAIRRO,
    cliente?.bairro
  );
  const cidade = pickString(
    p.NOME_CIDADE,
    pAny.NOME_CIDADE,
    pAny.CIDADE,
    pAny.cidade,
    pAny.CIDADE_ENTREGA,
    pAny.MUNICIPIO,
    cliente?.CIDADE,
    cliente?.cidade
  );
  const uf = pickString(
    p.ESTADO_DESTINO,
    pAny.ESTADO_DESTINO,
    pAny.UF,
    pAny.uf,
    pAny.UF_ENTREGA,
    pAny.ESTADO,
    cliente?.ESTADO,
    cliente?.estado,
    cliente?.UF,
    cliente?.uf
  );
  const cep = pickString(
    (p as any).CEP,
    p.CEP_ENTREGA,
    p.CEP_CONS_FINAL,
    pAny.CEP_ENTREGA,
    cliente?.CEP,
    cliente?.cep
  );
  return { logradouro, numero, complemento, bairro, cidade, uf, cep };
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
    'dd-MM-yyyy HH:mm:ss',
    'dd-MM-yyyy HH:mm',
    'dd-MM-yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd HH:mm',
    'yyyy/MM/dd'
  ];

  for (const formato of formatos) {
    const parsedDate = parse(raw, formato, new Date());
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }

  return null;
};

const getDataReferenciaPedido = (p: Pedido, tipoData?: 'recebimento' | 'entrega') => {
  if (tipoData === 'entrega') {
    return parsePedidoDate(p.DATA_ENTREGA) || parsePedidoDate((p as any).data_entrega);
  }

  // Padrão ou recebimento
  const dRec = getDataRecebimento(p);
  if (dRec) return dRec;

  // Se não tiver tipoData ou for recebimento mas não achou nada, tenta outros como fallback
  if (!tipoData) {
    return (
      parsePedidoDate(p.DATA_ENTREGA) ||
      parsePedidoDate((p as any).DATA_HORA_PEDIDO) ||
      parsePedidoDate(p.DATA_PEDIDO as any) ||
      parsePedidoDate(p.DATA_HORA_CADASTRO)
    );
  }

  return null;
};

const getDataRecebimento = (p: Pedido) => {
  const pAny = p as any;
  return (
    parsePedidoDate(p.DATA_HORA_RECEBIMENTO) ||
    parsePedidoDate(pAny.data_hora_recebimento) ||
    parsePedidoDate(p.DATA_RECEBIMENTO as any) ||
    parsePedidoDate(pAny.data_recebimento) ||
    parsePedidoDate(pAny.RECEBIMENTO) ||
    parsePedidoDate(pAny.recebimento) ||
    parsePedidoDate(pAny.DATA_HORA_RECEBIDO) ||
    parsePedidoDate(pAny.data_hora_recebido) ||
    parsePedidoDate(pAny.DATA_RECEBIDO) ||
    parsePedidoDate(pAny.data_recebido) ||
    parsePedidoDate(pAny.DATA_RECEB) ||
    parsePedidoDate(pAny.data_receb) ||
    parsePedidoDate(pAny.HORA_RECEBIMENTO) ||
    parsePedidoDate(pAny.HORA_RECEB) ||
    parsePedidoDate(pAny.DATA_HORA_ENTREGA) ||
    parsePedidoDate(pAny.data_hora_entrega)
  );
};

const sameDay = (d: Date, ref: Date) => {
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
};

const parseApuracaoId = (value: unknown) => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  }
  return null;
};

const getApuracaoId = (a: ApuracaoItem) => {
  return (
    parseApuracaoId((a as any).ORCAMENTO_BASE_ID) ??
    parseApuracaoId((a as any).ORCAMENTO_ID) ??
    parseApuracaoId((a as any).ORCAMENTO) ??
    parseApuracaoId((a as any).ORCAMENTOBASEID) ??
    parseApuracaoId((a as any).ORCAMENTO_BASE) ??
    parseApuracaoId((a as any).ORCAMENTOBASE)
  );
};

export default function CicloPedidoPage() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const pedidosRequestId = useRef(0);
  const statsRequestId = useRef(0);
  
  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje');
  const [filtroEntrega, setFiltroEntrega] = useState('entrega_fechados');
  const [tipoData, setTipoData] = useState<'recebimento' | 'entrega'>('recebimento');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState(String(anoAtual));
  const anosDisponiveis = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => anoAtual - i);
  }, [anoAtual]);
  
  // Resumo
  // Resumo
  const [stats, setStats] = useState({
    hoje: 0,
    mes: 0,
    valorHoje: 0,
    valorMes: 0,
    notasHoje: 0,
    controlesHoje: 0,
    totalNotas: 0,
    totalControles: 0,
    loading: false
  });

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const pedidosPorPagina = 50;
  const totalPaginas = Math.ceil(totalPedidos / pedidosPorPagina) || 1;

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const showCnpjColumn = useMemo(() => pedidos.some((p) => Boolean(getCnpjPedido(p))), [pedidos]);
  const showBairroColumn = useMemo(() => pedidos.some((p) => Boolean(getEnderecoCampos(p).bairro)), [pedidos]);
  const showCidadeColumn = useMemo(() => pedidos.some((p) => {
    const endereco = getEnderecoCampos(p);
    return Boolean(endereco.cidade || endereco.uf);
  }), [pedidos]);
  const tableColumnCount = 9 + (showCnpjColumn ? 1 : 0) + (showBairroColumn ? 1 : 0) + (showCidadeColumn ? 1 : 0);

  const getPeriodoConfig = () => {
    const hoje = new Date();
    if (filtroPeriodo === 'hoje') {
      const dataFormatada = format(hoje, 'yyyy-MM-dd');
      return { label: 'Hoje', inicio: dataFormatada, fim: dataFormatada };
    }
    if (filtroPeriodo === 'ontem') {
      const ontem = subDays(hoje, 1);
      const dataFormatada = format(ontem, 'yyyy-MM-dd');
      return { label: 'Ontem', inicio: dataFormatada, fim: dataFormatada };
    }
    if (filtroPeriodo === 'semana') {
      const inicioSemana = subDays(hoje, 7);
      return { label: 'Última semana', inicio: format(inicioSemana, 'yyyy-MM-dd'), fim: format(hoje, 'yyyy-MM-dd') };
    }
    if (filtroPeriodo === 'mes') {
      const primeiroDiaMes = format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd');
      const ultimoDiaMes = format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), 'yyyy-MM-dd');
      return { label: 'Este mês', inicio: primeiroDiaMes, fim: ultimoDiaMes };
    }
    if (filtroPeriodo === 'ano') {
      const ano = Number(anoSelecionado) || hoje.getFullYear();
      const inicioAno = format(new Date(ano, 0, 1), 'yyyy-MM-dd');
      const fimAno = format(new Date(ano, 11, 31), 'yyyy-MM-dd');
      return { label: `Ano ${ano}`, inicio: inicioAno, fim: fimAno };
    }
    if (filtroPeriodo === 'personalizado') {
      return { label: 'Personalizado', inicio: dataInicio, fim: dataFim };
    }
    return { label: 'Tudo', inicio: '', fim: '' };
  };

  const fetchAllFilteredPedidos = async () => {
    try {
      const periodo = getPeriodoConfig();
      let allData: Pedido[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        let url = `/api/pedidos/externos?limit=${limit}&offset=${offset}`;
        
        if (periodo.inicio) {
          url += `&data_inicio=${periodo.inicio}`;
        }
        if (periodo.fim) {
          url += `&data_fim=${periodo.fim}`;
        }

        if (filtroEntrega === 'entrega') {
          url += '&tipo_entrega=EPG,ENT';
        } else if (filtroEntrega === 'entrega_fechados') {
          url += '&tipo_entrega=EPG,ENT&status=FECHADO';
        } else if (filtroEntrega === 'nao_entrega') {
          url += '&tipo_entrega=NDF,ATO';
        }

        if (searchTerm.trim()) {
          url += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao carregar dados para exportação');
        const data: PedidosResponse = await response.json();
        
        if (data.data && data.data.length > 0) {
          allData = [...allData, ...data.data];
          offset += limit;
          hasMore = allData.length < data.total;
        } else {
          hasMore = false;
        }

        // Safety break to prevent infinite loops if API is misbehaving
        if (allData.length >= 10000) {
          console.warn('Limite de segurança de 10.000 registros atingido na exportação.');
          hasMore = false;
        }
      }

      // Buscar apurações para enriquecer os dados
      // Usar um range de datas amplo para pegar todas as apurações relevantes
      // IMPORTANTE: A API externa tem limite de ~100 registros por vez
      const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
      apuracoesUrl.searchParams.set('limit', '1000'); // Reduzido de 10000 para 1000
      apuracoesUrl.searchParams.set('offset', '0');
      // Usar um range de 5 anos para trás até hoje
      const hoje = new Date();
      const cincoAnosAtras = new Date();
      cincoAnosAtras.setFullYear(hoje.getFullYear() - 5);
      apuracoesUrl.searchParams.set('data_inicio', format(cincoAnosAtras, 'yyyy-MM-dd'));
      apuracoesUrl.searchParams.set('data_fim', format(hoje, 'yyyy-MM-dd'));

      const apResp = await fetch(apuracoesUrl.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
      let apMap = new Map<number, ApuracaoItem>();
      if (apResp.ok) {
        const apData: ApuracoesResponse = await apResp.json();
        apMap = new Map(
          (apData.data || [])
            .map(a => {
              const id = getApuracaoId(a);
              return id !== null ? [id, a] : null;
            })
            .filter((x): x is [number, ApuracaoItem] => !!x)
        );
      }

      // Enriquecer pedidos com dados das apurações (se disponíveis)
      const enriquecidos = allData.map(p => {
        const ap = apMap.get(p.ORCAMENTO_ID);
        const pAny = p as any;
        const identificacaoNfe = ap?.IDENTIFICACAO_NFE ?? (ap as any)?.CHAVE_NFE ?? (ap as any)?.CHAVE ?? pAny.IDENTIFICACAO_NFE ?? pAny.CHAVE_NFE ?? null;
        const numeroNota = ap?.NUMERO_NOTA ?? pAny.NUMERO_NOTA ?? null;
        const cnpjCpf = pickString(
          ap?.CNPJ_CPF,
          (ap as any)?.CNPJCPF,
          (ap as any)?.CNPJ_CPF_DESTINATARIO,
          (ap as any)?.CPF_CNPJ,
          ap?.CNPJ,
          ap?.CPF,
          (ap as any)?.CNPJ_DESTINATARIO,
          (ap as any)?.CPF_DESTINATARIO,
          pAny.CNPJ_CPF,
          pAny.CNPJ,
          pAny.CPF,
          pAny.cnpj,
          pAny.cpf
        );
        const bairroNota = ap?.NOME_BAIRRO_NOTA ?? ap?.BAIRRO ?? (ap as any)?.NOME_BAIRRO ?? pAny.NOME_BAIRRO_NOTA ?? pAny.BAIRRO ?? pAny.NOME_BAIRRO ?? null;
        const cidadeNota = ap?.NOME_CIDADE ?? ap?.CIDADE ?? pAny.NOME_CIDADE ?? pAny.CIDADE ?? null;
        const ufDestino = ap?.ESTADO_DESTINO ?? ap?.UF ?? pAny.ESTADO_DESTINO ?? pAny.UF ?? null;
        const logradouroEntrega = pAny.LOGRADOURO_ENTREGA ?? ap?.LOGRADOURO ?? (ap as any)?.LOGRADOURO_ENTREGA ?? (ap as any)?.ENDERECO ?? pAny.LOGRADOURO ?? pAny.ENDERECO ?? null;
        const complementoEntrega = pAny.COMPLEMENTO_ENTREGA ?? ap?.COMPLEMENTO ?? pAny.COMPLEMENTO ?? null;
        const cepEntrega = ap?.CEP ?? pAny.CEP ?? pAny.CEP_ENTREGA ?? pAny.CEP_CONS_FINAL ?? null;

        return {
          ...p,
          IDENTIFICACAO_NFE: identificacaoNfe,
          NUMERO_NOTA: numeroNota,
          CNPJ_CPF: cnpjCpf ?? pAny.CNPJ_CPF ?? null,
          CNPJ: pAny.CNPJ ?? cnpjCpf ?? null,
          NOME_BAIRRO_NOTA: bairroNota,
          NOME_CIDADE: cidadeNota,
          ESTADO_DESTINO: ufDestino,
          LOGRADOURO_ENTREGA: logradouroEntrega,
          COMPLEMENTO_ENTREGA: complementoEntrega,
          CEP: cepEntrega,
        } as Pedido;
      });

      return enriquecidos;
    } catch (error) {
      console.error('Erro ao buscar todos os pedidos:', error);
      throw error;
    }
  };

  const exportToExcel = async () => {
    try {
      showToast('Preparando Excel...', 'success');
      const allData = await fetchAllFilteredPedidos();
      
      const dataToExport = allData.map(p => ({
        'ID Pedido': p.ORCAMENTO_ID,
        'Nota': getNumeroNota(p) || 'Pendente',
        'Cliente': p.CLIENTE_NOME,
        'Vendedor': p.VENDEDOR_NOME,
        'Data': getDataReferenciaPedido(p, tipoData) ? format(getDataReferenciaPedido(p, tipoData)!, 'dd/MM/yyyy HH:mm') : '---',
        'Tipo Entrega': p.TIPO_ENTREGA,
        'Valor': parseValorNumero(p.VALOR_PEDIDO),
        'Status': p.CANCELADO === 'S' ? 'Cancelado' : p.PEDIDO_FECHADO === 'S' ? 'Fechado' : 'Aberto'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      XLSX.writeFile(wb, `pedidos_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      showToast('Excel exportado com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao exportar Excel', 'error');
    }
  };

  const exportToPDF = async () => {
    try {
      showToast('Preparando PDF...', 'success');
      const allData = await fetchAllFilteredPedidos();
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const drawHeader = (page: any) => {
        const { height } = page.getSize();
        page.drawText('Relatório de Ciclo de Pedidos', { x: 50, y: height - 50, size: 20, font: boldFont });
        page.drawText(`Data de geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { x: 50, y: height - 80, size: 10, font });
        
        // Cabeçalho da tabela
        const headerY = height - 120;
        page.drawText('ID', { x: 50, y: headerY, size: 10, font: boldFont });
        page.drawText('Cliente', { x: 100, y: headerY, size: 10, font: boldFont });
        page.drawText('Data', { x: 300, y: headerY, size: 10, font: boldFont });
        page.drawText('Valor', { x: 400, y: headerY, size: 10, font: boldFont });
        page.drawText('Status', { x: 500, y: headerY, size: 10, font: boldFont });
        return headerY - 20;
      };

      let page = pdfDoc.addPage();
      let y = drawHeader(page);

      allData.forEach((p, index) => {
        if (y < 50) {
          page = pdfDoc.addPage();
          y = drawHeader(page);
        }

        page.drawText(String(p.ORCAMENTO_ID), { x: 50, y, size: 8, font });
        page.drawText((p.CLIENTE_NOME || '').substring(0, 35), { x: 100, y, size: 8, font });
        page.drawText(getDataReferenciaPedido(p, tipoData) ? format(getDataReferenciaPedido(p, tipoData)!, 'dd/MM/yyyy') : '---', { x: 300, y, size: 8, font });
        page.drawText(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseValorNumero(p.VALOR_PEDIDO)), { x: 400, y, size: 8, font });
        page.drawText(p.CANCELADO === 'S' ? 'Cancelado' : p.PEDIDO_FECHADO === 'S' ? 'Fechado' : 'Aberto', { x: 500, y, size: 8, font });
        y -= 15;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pedidos_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      link.click();
      showToast('PDF exportado com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao exportar PDF', 'error');
    }
  };

  const exportarRelatorioAvancado = async () => {
    try {
      showToast('Gerando relatório completo...', 'success');
      const periodo = getPeriodoConfig();
      const params = new URLSearchParams();
      
      if (periodo.inicio) params.set('data_inicio', periodo.inicio);
      if (periodo.fim) params.set('data_fim', periodo.fim);
      params.set('tipo_data', tipoData);

      if (filtroEntrega === 'entrega') {
        params.set('tipo_entrega', 'EPG,ENT');
      } else if (filtroEntrega === 'entrega_fechados') {
        params.set('tipo_entrega', 'EPG,ENT');
        params.set('status', 'FECHADO');
      } else if (filtroEntrega === 'nao_entrega') {
        params.set('tipo_entrega', 'NDF,ATO');
      }

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      window.location.href = `/api/pedidos/exportar?${params.toString()}`;
    } catch (error) {
      console.error(error);
      showToast('Erro ao exportar relatório', 'error');
    }
  };

  const carregarPedidos = async () => {
    const reqId = ++pedidosRequestId.current;
    try {
      setLoading(true);
      const offset = (paginaAtual - 1) * pedidosPorPagina;
      let url = `/api/pedidos/externos?limit=${pedidosPorPagina}&offset=${offset}&tipo_data=${tipoData}`;
      const periodo = getPeriodoConfig();
      
      if (periodo.inicio) {
        url += `&data_inicio=${periodo.inicio}`;
      }
      if (periodo.fim) {
        url += `&data_fim=${periodo.fim}`;
      }

      if (filtroEntrega === 'entrega') {
        url += '&tipo_entrega=EPG,ENT';
      } else if (filtroEntrega === 'entrega_fechados') {
        url += '&tipo_entrega=EPG,ENT&status=FECHADO';
      } else if (filtroEntrega === 'nao_entrega') {
        url += '&tipo_entrega=NDF,ATO';
      }

      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      console.log('[Pedidos] Carregando URL:', url);

      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) {
        console.error('[Pedidos] Erro na resposta:', response.status, response.statusText);
        throw new Error('Erro ao carregar pedidos');
      }
      
      const data: PedidosResponse = await response.json();
      if (reqId !== pedidosRequestId.current) return;
      console.log('[Pedidos] Resposta API:', { 
        total: data.total, 
        count: data.data?.length,
        periodo: getPeriodoConfig()
      });
      
      const base = (data.data || []).slice().sort((a, b) => {
        const da = getDataReferenciaPedido(a, tipoData)?.getTime() ?? 0;
        const db = getDataReferenciaPedido(b, tipoData)?.getTime() ?? 0;
        return da - db;
      });
      
      // Log de amostra dos dados brutos da API
      if (base.length > 0) {
        console.log('[Pedidos] Amostra de pedido da API:', {
          ORCAMENTO_ID: base[0].ORCAMENTO_ID,
          IDENTIFICACAO_NFE: base[0].IDENTIFICACAO_NFE,
          NUMERO_NOTA: (base[0] as any).NUMERO_NOTA,
          NOME_BAIRRO_NOTA: (base[0] as any).NOME_BAIRRO_NOTA,
          NOME_CIDADE: (base[0] as any).NOME_CIDADE,
          ESTADO_DESTINO: (base[0] as any).ESTADO_DESTINO,
          LOGRADOURO_ENTREGA: base[0].LOGRADOURO_ENTREGA,
          keys: Object.keys(base[0]).filter(k => k.includes('BAIRRO') || k.includes('CIDADE') || k.includes('ESTADO') || k.includes('LOGRADOURO') || k.includes('ENDERECO') || k.includes('NFE') || k.includes('NOTA'))
        });
      }

      const valorTotal = (base || []).reduce((sum, p) => sum + parseValorNumero(p.VALOR_PEDIDO), 0);
      setPedidos(base);
      setTotalPedidos(data.total || 0);
      setStats(prev => ({
        ...prev,
        hoje: base.length || 0,
        valorHoje: valorTotal,
      }));

      const statsId = ++statsRequestId.current;
      void (async () => {
        try {
          const statsUrl = new URL('/api/pedidos/externos', window.location.origin);
          statsUrl.searchParams.set('stats', '1');
          statsUrl.searchParams.set('tipo_data', tipoData);
          if (periodo.inicio) statsUrl.searchParams.set('data_inicio', periodo.inicio);
          if (periodo.fim) statsUrl.searchParams.set('data_fim', periodo.fim);
          if (filtroEntrega === 'entrega') {
            statsUrl.searchParams.set('tipo_entrega', 'EPG,ENT');
          } else if (filtroEntrega === 'entrega_fechados') {
            statsUrl.searchParams.set('tipo_entrega', 'EPG,ENT');
            statsUrl.searchParams.set('status', 'FECHADO');
          } else if (filtroEntrega === 'nao_entrega') {
            statsUrl.searchParams.set('tipo_entrega', 'NDF,ATO');
          }
          if (searchTerm.trim()) statsUrl.searchParams.set('search', searchTerm.trim());

          const statsResp = await fetch(statsUrl.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
          if (!statsResp.ok) return;
          const statsData = await statsResp.json();
          if (statsId !== statsRequestId.current) return;
          const total = typeof statsData.total === 'number' ? statsData.total : base.length || 0;
          const totalValor = typeof statsData.totalValor === 'number' ? statsData.totalValor : valorTotal;
          setStats(prev => ({
            ...prev,
            hoje: total,
            valorHoje: totalValor
          }));
        } catch (err) {
          console.error('[Pedidos] Erro ao validar cards:', err);
        }
      })();

      const needsEnrich = base.some(p => {
        const cep = (p as any).CEP || p.CEP_ENTREGA || p.CEP_CONS_FINAL;
        return !getNumeroNota(p) || !getCnpjPedido(p) || !p.NOME_BAIRRO_NOTA || !p.NOME_CIDADE || !p.ESTADO_DESTINO || !cep;
      });

      if (base.length > 0 && needsEnrich) {
        void (async () => {
          try {
            const apuracoesUrl = new URL('/api/apuracoes', window.location.origin);
            apuracoesUrl.searchParams.set('limit', '1000');
            apuracoesUrl.searchParams.set('offset', '0');
            if (periodo.inicio) apuracoesUrl.searchParams.set('data_inicio', periodo.inicio);
            if (periodo.fim) apuracoesUrl.searchParams.set('data_fim', periodo.fim);

            const apResp = await fetch(apuracoesUrl.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
            if (!apResp.ok) return;
            const apData: ApuracoesResponse = await apResp.json();
            if (reqId !== pedidosRequestId.current) return;

            const apMap = new Map(
              (apData.data || [])
                .map(a => {
                  const id = getApuracaoId(a);
                  return id !== null ? [id, a] : null;
                })
                .filter((x): x is [number, ApuracaoItem] => !!x)
            );

            const enriquecidos = base.map(p => {
              const ap = apMap.get(p.ORCAMENTO_ID);
              if (!ap) return p;
              const pAny = p as any;
              const identificacaoNfe = ap?.IDENTIFICACAO_NFE ?? (ap as any)?.CHAVE_NFE ?? (ap as any)?.CHAVE ?? pAny.IDENTIFICACAO_NFE ?? pAny.CHAVE_NFE ?? null;
              const numeroNota = ap?.NUMERO_NOTA ?? pAny.NUMERO_NOTA ?? null;
              const cnpjCpf = pickString(
                ap?.CNPJ_CPF,
                (ap as any)?.CNPJCPF,
                (ap as any)?.CNPJ_CPF_DESTINATARIO,
                (ap as any)?.CPF_CNPJ,
                ap?.CNPJ,
                ap?.CPF,
                (ap as any)?.CNPJ_DESTINATARIO,
                (ap as any)?.CPF_DESTINATARIO,
                pAny.CNPJ_CPF,
                pAny.CNPJ,
                pAny.CPF,
                pAny.cnpj,
                pAny.cpf
              );
              const bairroNota = ap?.NOME_BAIRRO_NOTA ?? ap?.BAIRRO ?? (ap as any)?.NOME_BAIRRO ?? pAny.NOME_BAIRRO_NOTA ?? pAny.BAIRRO ?? pAny.NOME_BAIRRO ?? null;
              const cidadeNota = ap?.NOME_CIDADE ?? ap?.CIDADE ?? pAny.NOME_CIDADE ?? pAny.CIDADE ?? null;
              const ufDestino = ap?.ESTADO_DESTINO ?? ap?.UF ?? pAny.ESTADO_DESTINO ?? pAny.UF ?? null;
              const logradouroEntrega = pAny.LOGRADOURO_ENTREGA ?? ap?.LOGRADOURO ?? (ap as any)?.LOGRADOURO_ENTREGA ?? (ap as any)?.ENDERECO ?? pAny.LOGRADOURO ?? pAny.ENDERECO ?? null;
              const complementoEntrega = pAny.COMPLEMENTO_ENTREGA ?? ap?.COMPLEMENTO ?? pAny.COMPLEMENTO ?? null;
              const cepEntrega = ap?.CEP ?? pAny.CEP ?? pAny.CEP_ENTREGA ?? pAny.CEP_CONS_FINAL ?? null;

              return {
                ...p,
                IDENTIFICACAO_NFE: identificacaoNfe,
                NUMERO_NOTA: numeroNota,
                CNPJ_CPF: cnpjCpf ?? pAny.CNPJ_CPF ?? null,
                CNPJ: pAny.CNPJ ?? cnpjCpf ?? null,
                NOME_BAIRRO_NOTA: bairroNota,
                NOME_CIDADE: cidadeNota,
                ESTADO_DESTINO: ufDestino,
                LOGRADOURO_ENTREGA: logradouroEntrega,
                COMPLEMENTO_ENTREGA: complementoEntrega,
                CEP: cepEntrega,
              } as Pedido;
            });

            if (reqId !== pedidosRequestId.current) return;
            const ordenados = enriquecidos.slice().sort((a, b) => {
              const da = getDataReferenciaPedido(a, tipoData)?.getTime() ?? 0;
              const db = getDataReferenciaPedido(b, tipoData)?.getTime() ?? 0;
              return da - db;
            });
            setPedidos(ordenados);
          } catch (err) {
            console.error('[Pedidos] Erro ao enriquecer apurações:', err);
          }
        })();
      }
    } catch (error) {
      console.error('[Pedidos] Erro:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      if (reqId === pedidosRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      carregarPedidos();
    }, 250);
    return () => clearTimeout(handle);
  }, [paginaAtual, filtroPeriodo, filtroEntrega, tipoData, dataInicio, dataFim, anoSelecionado]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPaginaAtual(1);
    carregarPedidos();
  };

  // Carregar métricas do mês ativo e resumo de hoje
  useEffect(() => {
    const carregarResumos = async () => {
      try {
        setStats(s => ({ ...s, loading: true }));

        // Carregar resumo de hoje (Notas e Controles)
        try {
          const resumoHojeResp = await fetch('/api/dashboard/resumo-hoje', { credentials: 'include' });
          if (resumoHojeResp.ok) {
             const resumoHojeData = await resumoHojeResp.json();
             setStats(s => ({ 
               ...s, 
               hoje: resumoHojeData.pedidosHoje || 0,
               valorHoje: resumoHojeData.valorHoje || 0,
               notasHoje: resumoHojeData.notasHoje || 0,
               controlesHoje: resumoHojeData.controlesHoje || 0,
               totalNotas: resumoHojeData.totalNotas || 0,
               totalControles: resumoHojeData.totalControles || 0
             }));
          }
        } catch (e) {
          console.error('Erro ao carregar resumo de hoje:', e);
        }

        const hoje = new Date();
        const primeiroDiaMes = format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd');
        const ultimoDiaMes = format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), 'yyyy-MM-dd');

        // Carregar resumo de hoje dos pedidos externos
        try {
          const hojeStr = format(hoje, 'yyyy-MM-dd');
          const statsHojeUrl = new URL('/api/pedidos/externos', window.location.origin);
          statsHojeUrl.searchParams.set('stats', '1');
          statsHojeUrl.searchParams.set('tipo_data', tipoData);
          statsHojeUrl.searchParams.set('data_inicio', hojeStr);
          statsHojeUrl.searchParams.set('data_fim', hojeStr);
          statsHojeUrl.searchParams.set('status', 'FECHADO');

          const respHoje = await fetch(statsHojeUrl.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
          if (respHoje.ok) {
            const jsonHoje = await respHoje.json();
            setStats(s => ({ 
              ...s, 
              hoje: typeof jsonHoje.total === 'number' ? jsonHoje.total : 0,
              valorHoje: typeof jsonHoje.totalValor === 'number' ? jsonHoje.totalValor : 0
            }));
          }
        } catch (e) {
          console.error('Erro ao carregar resumo de hoje dos pedidos externos:', e);
        }

        console.log('[Resumo Mês] Buscando dados:', { primeiroDiaMes, ultimoDiaMes });
        
        const statsUrl = new URL('/api/pedidos/externos', window.location.origin);
        statsUrl.searchParams.set('stats', '1');
        statsUrl.searchParams.set('tipo_data', tipoData);
        statsUrl.searchParams.set('data_inicio', primeiroDiaMes);
        statsUrl.searchParams.set('data_fim', ultimoDiaMes);
        statsUrl.searchParams.set('status', 'FECHADO');

        const respMes = await fetch(statsUrl.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
        if (!respMes.ok) {
          setStats(s => ({ ...s, mes: 0, valorMes: 0, loading: false }));
          return;
        }
        const jsonMes = await respMes.json();
        const total = typeof jsonMes.total === 'number' ? jsonMes.total : 0;
        const valorMes = typeof jsonMes.totalValor === 'number' ? jsonMes.totalValor : 0;
        setStats(s => ({ ...s, mes: total, valorMes, loading: false }));
      } catch (err) {
        console.error('[Resumo Mês] Erro completo:', err);
        setStats(s => ({ ...s, mes: 0, valorMes: 0, loading: false }));
      }
    };
    carregarResumos();
  }, [tipoData]);

  return (
    <AppLayout 
      title="Pedidos Entregas" 
      subtitle="Entregas fechadas do dia e resumo do mês"
    >
      <Head>
        <title>Pedidos Entregas | ControlCarga</title>
      </Head>

      <div className="space-y-6">
        {/* Resumo em Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          <StatCard
            title="Pedidos do Dia"
            value={stats.hoje}
            icon={ShoppingCart}
            color="blue"
            trend="Sincronizado em tempo real"
            loading={stats.loading}
            size="sm"
          />

          <StatCard
            title="Valor Total do Dia"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.valorHoje)}
            icon={TrendingUp}
            color="green"
            trend="Atualizado agora"
            loading={stats.loading}
            size="sm"
          />

          <StatCard
            title="Notas de Hoje"
            value={stats.notasHoje}
            icon={FileText}
            color="orange"
            trend="Hoje"
            loading={stats.loading}
            size="sm"
          />

          <StatCard
            title="Controles de Hoje"
            value={stats.controlesHoje}
            icon={Truck}
            color="cyan"
            trend="Hoje"
            loading={stats.loading}
            size="sm"
          />
        </div>

        {/* Filtros e Busca */}
        <Card className="overflow-visible">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <SearchInput 
                placeholder="Buscar por cliente, pedido ou vendedor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" variant="primary" iconLeft={<Search className="w-4 h-4" />}>
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Select 
                  className="pl-10"
                  value={tipoData}
                  onChange={(e) => {
                    setTipoData(e.target.value as 'recebimento' | 'entrega');
                    setPaginaAtual(1);
                  }}
                >
                  <option value="recebimento">Data de Recebimento</option>
                  <option value="entrega">Data de Entrega</option>
                </Select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Select 
                  className="pl-10"
                  value={filtroPeriodo}
                  onChange={(e) => {
                    setFiltroPeriodo(e.target.value);
                    setPaginaAtual(1);
                  }}
                >
                  <option value="hoje">Hoje</option>
                  <option value="ontem">Ontem</option>
                  <option value="semana">Última Semana</option>
                  <option value="mes">Este Mês</option>
                  <option value="ano">Este Ano</option>
                  <option value="personalizado">Personalizado</option>
                </Select>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Select 
                  className="pl-10"
                  value={filtroEntrega}
                  onChange={(e) => setFiltroEntrega(e.target.value)}
                >
                  <option value="entrega_fechados">Entrega e Fechados</option>
                  <option value="entrega">Somente Entrega</option>
                  <option value="nao_entrega">Não Entrega</option>
                  <option value="todos">Todos os Pedidos</option>
                </Select>
              </div>

              <Button 
                variant="secondary" 
                iconLeft={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
                onClick={() => carregarPedidos()}
                disabled={loading}
              >
                Atualizar
              </Button>

              <Button 
                variant="outline" 
                iconLeft={<Download className="w-4 h-4" />}
                onClick={exportarRelatorioAvancado}
              >
                Relatório Excel
              </Button>
            </div>
          </div>

          {filtroPeriodo === 'ano' && (
            <div className="flex flex-wrap items-center gap-4 mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Select
                    className="pl-10"
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                  >
                    {anosDisponiveis.map((ano) => (
                      <option key={ano} value={String(ano)}>
                        {ano}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}
          {filtroPeriodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-4 mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <Label>Data Início</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="date" 
                    className="pl-10"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="date" 
                    className="pl-10"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Tabela de Pedidos */}
        <Card noPadding className="relative min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-textMain">Pedido / Nota</th>
                  <th className="px-6 py-4 font-semibold text-textMain">Cliente</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden md:table-cell">Data</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden lg:table-cell">Entrega</th>
                  {showCnpjColumn && (
                    <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">CNPJ</th>
                  )}
                  <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">Endereço</th>
                  {showBairroColumn && (
                    <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">Bairro</th>
                  )}
                  {showCidadeColumn && (
                    <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">Cidade/UF</th>
                  )}
                  <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">CEP</th>
                  <th className="px-6 py-4 font-semibold text-textMain">Valor</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden sm:table-cell">Status</th>
                  <th className="px-6 py-4 font-semibold text-textMain text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={tableColumnCount} className="px-6 py-4">
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumnCount} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-textMuted">
                        <ShoppingCart className="w-10 h-10 opacity-20" />
                        <p>Nenhum pedido encontrado para os filtros selecionados.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => {
                    const enderecoCampos = getEnderecoCampos(p);
                    const logradouroCompleto = [enderecoCampos.logradouro, enderecoCampos.numero, enderecoCampos.complemento]
                      .filter(Boolean)
                      .join(', ');
                    const cidadeUf = [enderecoCampos.cidade, enderecoCampos.uf].filter(Boolean).join('/');
                    const numeroNota = getIdentificacaoNfeReduzida(p.IDENTIFICACAO_NFE) || getNumeroNota(p);

                    return (
                    <tr key={p.ORCAMENTO_ID} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-textMain">#{p.ORCAMENTO_ID}</span>
                          <span className="text-[10px] text-textMuted font-medium uppercase tracking-wider">
                            {numeroNota ? `NF: ${numeroNota}` : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 items-center justify-center text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="font-medium text-textMain truncate" title={p.CLIENTE_NOME}>
                              {p.CLIENTE_NOME}
                            </span>
                            <span className="text-[10px] text-textMuted truncate">
                              {p.VENDEDOR_NOME}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-textMain">
                            {getDataReferenciaPedido(p, tipoData) ? format(getDataReferenciaPedido(p, tipoData)!, 'dd/MM/yyyy') : '---'}
                          </span>
                          <span className="text-[10px] text-textMuted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getDataReferenciaPedido(p, tipoData) ? format(getDataReferenciaPedido(p, tipoData)!, 'HH:mm') : '--:--'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const tipoEntrega = String(p.TIPO_ENTREGA || '').toUpperCase();
                            const isEntrega = ['EPG', 'ENT'].includes(tipoEntrega);
                            return isEntrega ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : null;
                          })()}
                        </div>
                      </td>
                      {showCnpjColumn && (
                        <td className="px-6 py-4 hidden xl:table-cell">
                          <span className="text-textMain">
                            {getCnpjPedido(p) || '---'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <span className="text-textMain text-xs leading-tight">
                          {logradouroCompleto || '---'}
                        </span>
                      </td>
                      {showBairroColumn && (
                        <td className="px-6 py-4 hidden xl:table-cell">
                          <span className="text-textMain">
                            {enderecoCampos.bairro || '---'}
                          </span>
                        </td>
                      )}
                      {showCidadeColumn && (
                        <td className="px-6 py-4 hidden xl:table-cell">
                          <span className="text-textMain">
                            {cidadeUf || '---'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <span className="text-textMain text-xs leading-tight">
                          {enderecoCampos.cep || '---'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-textMain">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseValorNumero(p.VALOR_PEDIDO))}
                          </span>
                          <div className="sm:hidden mt-1">
                            {p.CANCELADO === 'S' ? (
                              <Badge variant="danger">Cancelado</Badge>
                            ) : p.PEDIDO_FECHADO === 'S' ? (
                              <Badge variant="success">Fechado</Badge>
                            ) : (
                              <Badge variant="warning">Aberto</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          {p.CANCELADO === 'S' ? (
                            <Badge variant="danger">Cancelado</Badge>
                          ) : p.PEDIDO_FECHADO === 'S' ? (
                            <Badge variant="success">Fechado</Badge>
                          ) : (
                            <Badge variant="warning">Aberto</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPedidoSelecionado(p);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação Estilo SaaS */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-textMuted font-medium">
              Mostrando <span className="text-textMain font-bold">{(paginaAtual - 1) * pedidosPorPagina + 1}</span> a <span className="text-textMain font-bold">{Math.min(paginaAtual * pedidosPorPagina, totalPedidos)}</span> de <span className="text-textMain font-bold">{totalPedidos}</span> resultados
            </p>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="secondary" 
                size="sm" 
                iconLeft={<ChevronsLeft className="w-4 h-4" />}
                onClick={() => setPaginaAtual(1)}
                disabled={paginaAtual === 1 || loading}
              />
              <Button 
                variant="secondary" 
                size="sm" 
                iconLeft={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1 || loading}
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-semibold text-textMain">Página {paginaAtual} de {totalPaginas}</span>
              </div>

              <Button 
                variant="secondary" 
                size="sm" 
                iconRight={<ChevronRight className="w-4 h-4" />}
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas || loading}
              >
                Próxima
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                iconLeft={<ChevronsRight className="w-4 h-4" />}
                onClick={() => setPaginaAtual(totalPaginas)}
                disabled={paginaAtual === totalPaginas || loading}
              />
            </div>
          </div>
        </Card>

        {/* Ações de Exportação */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button 
            variant="outline" 
            iconLeft={<FileSpreadsheet className="w-4 h-4" />}
            onClick={exportToExcel}
            className="w-full sm:w-auto"
          >
            Exportar Excel
          </Button>
          <Button 
            variant="outline" 
            iconLeft={<FileText className="w-4 h-4" />}
            onClick={exportToPDF}
            className="w-full sm:w-auto"
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Detalhes do Pedido #${pedidoSelecionado?.ORCAMENTO_ID}`}
        size="lg"
      >
        {pedidoSelecionado && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-textMain uppercase tracking-wider border-b border-slate-100 pb-2">Informações Gerais</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Cliente</p>
                    <p className="text-sm font-medium">{pedidoSelecionado.CLIENTE_NOME}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Vendedor</p>
                    <p className="text-sm font-medium">{pedidoSelecionado.VENDEDOR_NOME}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Data Cadastro</p>
                    <p className="text-sm font-medium">
                      {getDataReferenciaPedido(pedidoSelecionado) ? format(getDataReferenciaPedido(pedidoSelecionado)!, 'dd/MM/yyyy HH:mm') : '---'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Valor Total</p>
                    <p className="text-sm font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseValorNumero(pedidoSelecionado.VALOR_PEDIDO))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-textMain uppercase tracking-wider border-b border-slate-100 pb-2">Logística</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Tipo Entrega</p>
                    <Badge variant={pedidoSelecionado.TIPO_ENTREGA === 'NDF' ? 'neutral' : 'info'}>
                      {pedidoSelecionado.TIPO_ENTREGA}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold">Status</p>
                    {pedidoSelecionado.CANCELADO === 'S' ? (
                      <Badge variant="danger">Cancelado</Badge>
                    ) : pedidoSelecionado.PEDIDO_FECHADO === 'S' ? (
                      <Badge variant="success">Fechado</Badge>
                    ) : (
                      <Badge variant="warning">Aberto</Badge>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Endereço de Entrega</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-textMuted" />
                      {getEnderecoResumo(pedidoSelecionado) || 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {pedidoSelecionado.OBSERVACAO && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] text-textMuted uppercase font-bold">Observações</p>
                <p className="text-sm text-textMain italic">{pedidoSelecionado.OBSERVACAO}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Toast Notification */}
      {toast.show && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 w-[calc(100%-2rem)] max-w-[400px] md:w-auto",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </AppLayout>
  );
}
