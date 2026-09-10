import { buscarEmbarquesAtuais } from '@/lib/pedido-embarques-atuais';
import { buscarLogisticaAtual } from '@/lib/pedido-logistica-atual';
import { dadosPedido } from '@/lib/pedido-apresentacao';
import { saldoPendente, saldoDetalhadoPendente, itensComSaldoPendente, pedidoTemDevolucao, pedidoTemEntregaGerada, codigoAdmDoProduto } from '@/lib/pedido-pendencias';
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';
import { getPedidosDashboard } from '@/lib/dashboard-external-cache';
import { montarDashboardPorSnapshot } from '@/lib/logistica-snapshot';
import prisma from '@/lib/prisma';

const DASHBOARD_PREVISAO_FINAL = '2050-12-31';
const DEFAULT_CACHE_KEY = 'sem-inicio:sem-fim';
const DASHBOARD_CACHE_TTL_MS = 3 * 60_000;
const DASHBOARD_STALE_TTL_MS = 60 * 60_000;
const MAX_NOTAS_EM_CONTROLE_DETALHE = 500;
const DASHBOARD_EXTERNAL_TIMEOUT_MS = 15_000;
const DASHBOARD_ENRICH_CONCURRENCY = 20;
const MAX_LOGISTICA_LOOKUPS_PER_REQUEST = 40;
const STATUS_ORDER = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'PEDIDO_EMBARCADO',
  'PEDIDOS_EMBARCADOS',
  'PENDENCIAS',
  'ALERTAS_NAO_SEPARADOS',
  'ALERTAS_NAO_CONFERIDOS',
  'ALERTAS_NAO_EMBARCADOS',
] as const;

type StatusCode = (typeof STATUS_ORDER)[number];

type DashboardPedidoItem = {
  statusOperacionalCodigo?: string;
  pedidoId: number;
  tipoEntrega: string | null;
  clienteNome: string;
  nomeFantasia: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: string | null;
  previsaoEntrega: string | null;
  localNome: string | null;
  statusCodigo: string;
  statusDescricao: string;
  statusSeparacao: string | null;
  situacaoAtual: string;
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
};

type DashboardStatusItem = {
  codigo: StatusCode;
  titulo: string;
  descricao: string;
  statusSeparacao: string;
  total: number;
  pedidos: DashboardPedidoItem[];
};

type DashboardResponse = {
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
    pedidosRetirados?: number;
    transportadoras?: Record<string, number>;
  };
  indicadores: DashboardStatusItem[];
  cached?: boolean;
  stale?: boolean;
  warning?: string;
};

const STATUS_META: Record<StatusCode, Omit<DashboardStatusItem, 'total' | 'pedidos'>> = {
  PEDIDO_NOVO: {
    codigo: 'PEDIDO_NOVO',
    titulo: 'PEDIDOS PARA SEPARAÇÃO',
    descricao: 'Status da separacao de pendencias: ABERTO',
    statusSeparacao: 'ABERTO',
  },
  PEDIDO_EM_SEPARACAO: {
    codigo: 'PEDIDO_EM_SEPARACAO',
    titulo: 'PEDIDOS EM SEPARAÇÃO',
    descricao: 'Status da separacao de pendencias: EM SEPARACAO',
    statusSeparacao: 'EM SEPARACAO',
  },
  PEDIDO_SEPARADO: {
    codigo: 'PEDIDO_SEPARADO',
    titulo: 'PEDIDOS SEPARADOS AGUARDANDO CONFERÊNCIA',
    descricao: 'Pedidos com status E aguardando conferência',
    statusSeparacao: 'SEPARADO',
  },
  PEDIDO_EMBARCADO: {
    codigo: 'PEDIDO_EMBARCADO',
    titulo: 'PEDIDOS CONFERIDOS AGUARDANDO EMBARQUE',
    descricao: 'Usuario de confirmacao com data e hora',
    statusSeparacao: 'EMBARCADO',
  },
  PEDIDOS_EMBARCADOS: {
    codigo: 'PEDIDOS_EMBARCADOS',
    titulo: 'PEDIDOS EMBARCADOS',
    descricao: 'Nota fiscal incluida em um controle de cargas',
    statusSeparacao: 'EMBARCADO NO CONTROLE',
  },
  PENDENCIAS: {
    codigo: 'PENDENCIAS',
    titulo: 'PEDIDOS COM PRODUTOS NÃO ENCONTRADOS',
    descricao: 'Pedidos com pendencias, independentemente do periodo informado',
    statusSeparacao: 'PENDENCIA',
  },
  ALERTAS_NAO_SEPARADOS: {
    codigo: 'ALERTAS_NAO_SEPARADOS',
    titulo: 'PEDIDOS ATRASADOS: NÃO SEPARADOS',
    descricao: 'Pedidos novos e em separação (A e S) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_SEPARADO',
  },
  ALERTAS_NAO_CONFERIDOS: {
    codigo: 'ALERTAS_NAO_CONFERIDOS',
    titulo: 'PEDIDOS ATRASADOS: NÃO CONFERIDOS',
    descricao: 'Pedidos separados (E) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_CONFERIDO',
  },
  ALERTAS_NAO_EMBARCADOS: {
    codigo: 'ALERTAS_NAO_EMBARCADOS',
    titulo: 'PEDIDOS ATRASADOS: CONFERIDOS E NÃO EMBARCADOS',
    descricao: 'Pedidos conferidos (G) recebidos em dias anteriores ou, no dia atual, após passar o corte de 16:00',
    statusSeparacao: 'ALERTA_NAO_EMBARCADO',
  },
};

let dashboardCache: {
  expiresAt: number;
  staleAt: number;
  payload: DashboardResponse;
} | null = null;
const dashboardCacheByPeriodo = new Map<
  string,
  {
    expiresAt: number;
    staleAt: number;
    payload: DashboardResponse;
  }
>();
const PEDIDO_LOGISTICA_CACHE_TTL_MS = 60_000;
const pedidoLogisticaCache = new Map<number, { expiresAt: number; payload: Record<string, any> | null }>();
const pedidoLogisticaPending = new Map<number, Promise<Record<string, any> | null>>();
const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const onlyDigits = (value: string | null | undefined) => String(value || '').replace(/\D/g, '');

const normalizeNumeroNota = (value: string | null | undefined): string => {
  const digits = onlyDigits(value);
  if (!digits) return String(value || '').trim().toLowerCase();
  return digits.replace(/^0+/, '') || '0';
};

const pickString = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    const parsed = toStringValue(value);
    if (parsed) return parsed;
  }
  return null;
};

type ControleVinculoInfo = {
  numeroManifesto: string | null;
  transportadoraNome: string | null;
  dataHoraControle: string | null;
};

const getControleLocalNome = (controle: ControleVinculoInfo | null) =>
  controle?.numeroManifesto ? `Controle ${controle.numeroManifesto}` : 'Controle de carga';

const mapWithConcurrency = async <T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
) => {
  const results: R[] = new Array(values.length);
  let index = 0;

  const worker = async () => {
    while (index < values.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
};

const getPedidoLogisticaCached = async (pedidoId: number, username: string, password: string) => {
  const cached = pedidoLogisticaCache.get(pedidoId);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const pending = pedidoLogisticaPending.get(pedidoId);
  if (pending) return pending;

  const request = (async () => {
    try {
      const payload = await buscarLogisticaAtual(pedidoId, username, password);
      pedidoLogisticaCache.set(pedidoId, {
        expiresAt: Date.now() + PEDIDO_LOGISTICA_CACHE_TTL_MS,
        payload: (payload as Record<string, any> | null) || null,
      });
      return (payload as Record<string, any> | null) || null;
    } finally {
      pedidoLogisticaPending.delete(pedidoId);
    }
  })();

  pedidoLogisticaPending.set(pedidoId, request);
  return request;
};

const parsePedidoDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateOnly = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const getPeriodoFiltro = (req: NextApiRequest) => {
  const dataInicioRaw =
    typeof req.query.data_inicio === 'string' ? req.query.data_inicio.trim() : '';
  const dataFimRaw = typeof req.query.data_fim === 'string' ? req.query.data_fim.trim() : '';

  const dataInicio = parseDateOnly(dataInicioRaw);
  const dataFim = parseDateOnly(dataFimRaw);

  if (dataInicioRaw && !dataInicio) {
    throw new Error('data_inicio_invalida');
  }

  if (dataFimRaw && !dataFim) {
    throw new Error('data_fim_invalida');
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new Error('periodo_invalido');
  }

  return {
    dataInicio,
    dataFim,
    dataInicioIso: dataInicio ? formatDateOnly(dataInicio) : null,
    dataFimIso: dataFim ? formatDateOnly(dataFim) : null,
    cacheKey: `${dataInicio ? formatDateOnly(dataInicio) : 'sem-inicio'}:${dataFim ? formatDateOnly(dataFim) : 'sem-fim'}`,
  };
};

const getCacheByPeriodo = (cacheKey: string) =>
  cacheKey === DEFAULT_CACHE_KEY ? dashboardCache : dashboardCacheByPeriodo.get(cacheKey);

const setCacheByPeriodo = (cacheKey: string, payload: DashboardResponse) => {
  const cacheEntry = {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    staleAt: Date.now() + DASHBOARD_STALE_TTL_MS,
    payload,
  };

  if (cacheKey === DEFAULT_CACHE_KEY) {
    dashboardCache = cacheEntry;
  } else {
    dashboardCacheByPeriodo.set(cacheKey, cacheEntry);
  }

  return cacheEntry;
};

const getEmptyDashboardPayload = (warning: string): DashboardResponse => ({
  generatedAt: new Date().toISOString(),
  filtros: {
    localProduto: 'Todos',
    dataFim: '',
  },
  resumo: {
    totalPedidos: 0,
    totalEmbarcados: 0,
    totalPendentes: 0,
    totalPendencias: 0,
  },
  indicadores: STATUS_ORDER.map((codigo) => ({
    ...STATUS_META[codigo],
    total: 0,
    pedidos: [],
  })),
  warning,
});

const listarDashboardComRetry = async (
  filtros: { empresa_id?: number; data_inicio?: string; data_fim?: string },
  username: string,
  password: string,
  timeoutMs = DASHBOARD_EXTERNAL_TIMEOUT_MS
) => {
  return apiExternaService.listarDashboardLogistica(
    filtros,
    username,
    password,
    timeoutMs
  );
};

const getPedidoDataHoraRecebimento = (pedido: Record<string, unknown>) =>
  parsePedidoDate(
    pedido.DATA_HORA_RECEBIMENTO ??
      pedido.data_hora_recebimento ??
      pedido.DATA_RECEBIMENTO ??
      pedido.data_recebimento ??
      null
  );

const isPedidoRecebido = (pedido: Record<string, unknown>) => {
  const recebidoFlag = String(pedido.RECEBIDO ?? pedido.recebido ?? '').toUpperCase() === 'S';
  return recebidoFlag && Boolean(getPedidoDataHoraRecebimento(pedido));
};

const isPedidoEmpresa1Recebido = (pedido: Record<string, unknown>) => {
  const empresaId = Number(pedido.EMPRESA_ID ?? pedido.empresa_id ?? 0);
  return empresaId === 1 && isPedidoRecebido(pedido);
};

const hasResumoPendenciaNoPedido = (pedido: Record<string, unknown>) =>
  (toNumber(pedido.total_itens_pendentes) || 0) > 0 ||
  (toNumber(pedido.itens_em_separacao) || 0) > 0 ||
  (toNumber(pedido.quantidade_em_separacao_total) || 0) > 0 ||
  ['S', 'SIM', 'TRUE', '1'].includes(
    String(pedido.possui_produtos_faltando ?? pedido.POSSUI_PRODUTO_FALTANDO ?? '').trim().toUpperCase()
  );

const isPedidoSomenteComSeparacaoAberta = (pedido: Record<string, unknown>) => {
  const ultimoStatus = toStringValue(pedido.ultimo_status_separacao)?.trim().toUpperCase() || null;
  const statusSeparacoes = (toStringValue(pedido.status_separacoes) || '')
    .split(',')
    .map((status) => status.trim().toUpperCase())
    .filter(Boolean);
  const statusLogistico = toStringValue(
    (pedido.status_logistico as Record<string, unknown> | undefined)?.codigo
  )?.trim().toUpperCase();
  const possuiStatusConcluido =
    ['E', 'G'].includes(ultimoStatus || '') ||
    statusSeparacoes.some((status) => ['E', 'G'].includes(status));
  const possuiStatusAberto =
    ['A', 'S'].includes(ultimoStatus || '') ||
    statusSeparacoes.some((status) => ['A', 'S'].includes(status)) ||
    ['PEDIDO_NOVO', 'PEDIDO_EM_SEPARACAO'].includes(statusLogistico || '');

  return possuiStatusAberto && !possuiStatusConcluido;
};

const deriveDashboardStatus = (
  pedido: Record<string, unknown>,
  statusLogistico: Record<string, unknown>,
  logistica: Record<string, any> | null
): StatusCode | null => {
  const statusApi = toStringValue(statusLogistico.codigo);
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  const ultimaEntregaId = toNumber(pedido.ultima_entrega_id);
  const statusSeparacoesRaw = toStringValue(pedido.status_separacoes);
  const statusSeparacoes = new Set(
    (statusSeparacoesRaw || '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  );
  const entregaConfirmada = String(pedido.entrega_confirmada || '').trim().toUpperCase() === 'S';
  if (entregaConfirmada) {
    return 'PEDIDO_EMBARCADO';
  }

  if (ultimoStatusSeparacao === 'A') {
    return 'PEDIDO_NOVO';
  }

  if (ultimoStatusSeparacao === 'S') {
    return 'PEDIDO_EM_SEPARACAO';
  }

  if (ultimoStatusSeparacao === 'E') {
    return 'PEDIDO_SEPARADO';
  }

  if (ultimoStatusSeparacao === 'G' || statusSeparacoes.has('G')) {
    return 'PEDIDO_EMBARCADO';
  }

  if (statusSeparacoes.has('E')) {
    return 'PEDIDO_SEPARADO';
  }

  if (statusApi === 'SEM_LOGISTICA') {
    return 'PEDIDO_NOVO';
  }

  return statusApi && statusApi !== 'PENDENCIAS' && STATUS_ORDER.includes(statusApi as StatusCode)
    ? (statusApi as StatusCode)
    : null;
};

const isPedidoComPendencias = (
  pedido: Record<string, unknown>,
  logistica: Record<string, any> | null
) => {
  if (pedidoTemDevolucao(pedido, logistica)) return false;
  const statusLogisticoCodigo = toStringValue(
    (pedido.status_logistico as Record<string, unknown> | undefined)?.codigo
  )?.toUpperCase();
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  const statusSeparacoes = (toStringValue(pedido.status_separacoes) || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const possuiProdutoFaltando = (item: Record<string, unknown>) =>
    ['S', 'SIM', 'TRUE', '1'].includes(
      String(item.POSSUI_PRODUTO_FALTANDO ?? item.possui_produto_faltando ?? item.PRODUTO_FALTANDO ?? item.produto_faltando ?? item.PRODUTO_NAO_ENCONTRADO ?? item.produto_nao_encontrado ?? item.NAO_ENCONTRADO ?? item.nao_encontrado ?? item.FALTA ?? item.falta ?? '').trim().toUpperCase()
    ) ||
    (toNumber(item.QUANTIDADE_FALTANTE ?? item.quantidade_faltante ?? item.QTD_FALTANTE ?? item.qtd_faltante) || 0) > 0;
  const itensComparativo = Array.isArray(logistica?.comparativo_separacao_pendentes)
    ? logistica.comparativo_separacao_pendentes
    : [];
  const itensEntregasPendentes = Array.isArray(logistica?.itens_entregas_pendentes)
    ? logistica.itens_entregas_pendentes
    : [];
  const totalItensPendentes = toNumber(logistica?.resumo_pendencias_logisticas?.total_itens_pendentes) || 0;
  const separacoes = Array.isArray(logistica?.separacoes) ? logistica.separacoes : [];
  const itensSeparacoes = Array.isArray(logistica?.itens_separacoes) ? logistica.itens_separacoes : [];
  const possuiSeparacaoEfetivada =
    ultimoStatusSeparacao === 'G' ||
    statusSeparacoes.includes('G') ||
    separacoes.some((separacao) => {
      const status = String(separacao.STATUS ?? '').trim().toUpperCase();
      return (
        status === 'G' ||
        Boolean(separacao.DATA_HORA_BAIXA ?? separacao.DATA_BAIXA) ||
        (toNumber(separacao.QUANTIDADE_BAIXADA) || 0) > 0
      );
    }) ||
    itensSeparacoes.some((item) => (toNumber(item.QUANTIDADE_BAIXADA) || 0) > 0);
  const possuiSaldoPendente =
    itensComparativo.some((item) =>
      (toNumber(item.SALDO_PENDENTE) || 0) > 0 ||
      (toNumber(item.QUANTIDADE_PENDENTE_TOTAL) || 0) > 0 ||
      (toNumber(item.EM_SEPARACAO_PENDENTE) || 0) > 0 ||
      (toNumber(item.SALDO_NA_SEPARACAO) || 0) > 0
    ) ||
    itensEntregasPendentes.some((item) =>
      (toNumber(item.SALDO) || 0) > 0 ||
      (toNumber(item.QUANTIDADE_EM_SEPARACAO) || 0) > 0 ||
      (toNumber(item.QTD_EM_SEPARACAO_TRAN_ENT_PEN) || 0) > 0
    );

  const possuiProdutosFaltando =
    possuiProdutoFaltando(pedido) ||
    possuiProdutoFaltando(logistica?.resumo_pendencias_logisticas || {}) ||
    itensComparativo.some(possuiProdutoFaltando) ||
    itensEntregasPendentes.some(possuiProdutoFaltando);

  // Saldo de separacao aberta, status e total historico nao bastam: o card
  // deve conter somente pedidos com produto faltando confirmado pelo ERP.
  return possuiSeparacaoEfetivada && possuiProdutosFaltando && pedidoTemEntregaGerada(pedido, logistica);
};

const hasStatusSeparacao = (pedido: Record<string, unknown>, status: string) => {
  const statusNormalizado = status.trim().toUpperCase();
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  if (ultimoStatusSeparacao === statusNormalizado) return true;

  return (toStringValue(pedido.status_separacoes) || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .includes(statusNormalizado);
};

const shouldOcultarPedidoNoCardSeparado = (
  pedido: Record<string, unknown>,
  logistica: Record<string, any> | null
) => isPedidoComPendencias(pedido, logistica) && hasStatusSeparacao(pedido, 'G') && hasStatusSeparacao(pedido, 'E');

// Helper: verifica se o pedido deve aparecer nos alertas.
// Pedidos de dias anteriores entram sempre.
// Pedidos do dia atual entram somente depois que o horario de corte passar
// e apenas se tiverem sido recebidos antes de 16:01.
const isPedidoParaAlerta = (pedido: Record<string, unknown>): boolean => {
  const dataHoraRecebimento = getPedidoDataHoraRecebimento(pedido);
  if (!dataHoraRecebimento) return true; // Se não tem data, considera para alerta

  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const corte16h01 = new Date(hoje);
  corte16h01.setHours(16, 1, 0, 0);

  if (dataHoraRecebimento < hoje) {
    return true;
  }

  if (agora < corte16h01) {
    return false;
  }

  return dataHoraRecebimento < corte16h01;
};

// Helper: deriva o status de alerta baseado no status de separação
const deriveAlertaStatus = (
  statusCodigo: StatusCode,
  possuiPendencia: boolean,
  embarcadoNoControle: boolean
): StatusCode | null => {
  if (embarcadoNoControle || possuiPendencia) {
    return null;
  }

  if (statusCodigo === 'PEDIDO_NOVO' || statusCodigo === 'PEDIDO_EM_SEPARACAO') {
    return 'ALERTAS_NAO_SEPARADOS';
  }

  if (statusCodigo === 'PEDIDO_SEPARADO') {
    return 'ALERTAS_NAO_CONFERIDOS';
  }

  if (statusCodigo === 'PEDIDO_EMBARCADO') {
    return 'ALERTAS_NAO_EMBARCADOS';
  }

  return null;
};

const getAssinaturaPedido = (pedido: Record<string, unknown>) =>
  JSON.stringify([
    pedido.ORCAMENTO_ID,
    pedido.RECEBIDO,
    pedido.DATA_HORA_RECEBIMENTO,
    pedido.PEDIDO_FECHADO,
    pedido.DATA_ENTREGA,
    pedido.VALOR_PEDIDO,
  ]);

const pickPrevisaoEntrega = (logistica: Record<string, any> | null): string | null => {
  const entrega = Array.isArray(logistica?.entregas) ? logistica.entregas[0] : null;
  const itemSeparacao = Array.isArray(logistica?.itens_separacoes) ? logistica.itens_separacoes[0] : null;

  return (
    toStringValue(entrega?.PREVISAO_ENTREGA) ||
    toStringValue(logistica?.pedido?.DATA_ENTREGA) ||
    toStringValue(itemSeparacao?.PREVISAO_ENTREGA)
  );
};

const pickLocalNome = (logistica: Record<string, any> | null): string | null => {
  const separacao = Array.isArray(logistica?.separacoes) ? logistica.separacoes[0] : null;
  const entrega = Array.isArray(logistica?.entregas) ? logistica.entregas[0] : null;
  return toStringValue(separacao?.LOCAL_NOME) || toStringValue(entrega?.LOCAL_NOME);
};

const getProdutosPendentes = (logistica: Record<string, any> | null, statusSeparacao: string | null) => {
  const status = (statusSeparacao || '').toUpperCase();
  const itensEntregasPendentes = Array.isArray(logistica?.itens_entregas_pendentes)
    ? logistica.itens_entregas_pendentes
    : [];
  if (status === 'PENDENCIA') {
    return agruparProdutosPendentes(itensComSaldoPendente(logistica) || []);
  }

  const separacoesAtivas = Array.isArray(logistica?.separacoes)
    ? logistica.separacoes.filter((separacao: Record<string, any>) =>
        ['S', 'A', 'ATIVO'].includes(String(separacao.STATUS ?? '').toUpperCase())
      )
    : [];

  if (!status.includes('SEP.') || !status.includes('AG. GER. ENT.') || separacoesAtivas.length < 2) {
    return [];
  }

  const itens = [
    ...itensEntregasPendentes,
    ...(Array.isArray(logistica?.itens_separacoes) ? logistica.itens_separacoes : []),
  ];

  return agruparProdutosPendentes(itens);
};

const agruparProdutosPendentes = (itens: Record<string, any>[]) => {
  const agrupados = new Map<string, { produtoId: number | null; codigo: string | null; nome: string; quantidade: number }>();

  for (const item of itens as Record<string, any>[]) {
    const quantidade = saldoPendente(item);
    if (quantidade <= 0) continue;

    const produtoId = toNumber(item.PRODUTO_ID ?? item.produto_id ?? item.ITEM_ID ?? item.item_id);
    const codigo = codigoAdmDoProduto(item);
    const nome =
      toStringValue(item.PRODUTO_NOME) ||
      toStringValue(item.produto_nome) ||
      toStringValue(item.NOME_PRODUTO) ||
      toStringValue(item.nome_produto) ||
      toStringValue(item.NOME) ||
      toStringValue(item.nome) ||
      'Produto nao informado';
    const chave = String(produtoId ?? codigo ?? nome);
    const atual = agrupados.get(chave);
    if (atual) atual.quantidade += quantidade;
    else agrupados.set(chave, { produtoId, codigo, nome, quantidade });
  }

  return Array.from(agrupados.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

const getTiposEntrega = (pedido: Record<string, unknown>, logistica?: Record<string, unknown>) =>
  [
    pedido.tipo_entrega,
    pedido.TIPO_ENTREGA,
    pedido.tipoEntrega,
    pedido.TIPO_ENTREGA_DESCRICAO,
    pedido.tipo_entrega_descricao,
    pedido.DESCRICAO_TIPO_ENTREGA,
    pedido.descricao_tipo_entrega,
    pedido.DESCRICAO_ENTREGA,
    pedido.descricao_entrega,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.TIPO_ENTREGA,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.tipo_entrega,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.TIPO_ENTREGA_DESCRICAO,
    logistica?.TIPO_ENTREGA,
    logistica?.tipo_entrega,
    logistica?.TIPO_ENTREGA_DESCRICAO,
    (logistica?.pedido as Record<string, any> | undefined)?.TIPO_ENTREGA,
    (logistica?.pedido as Record<string, any> | undefined)?.tipo_entrega,
    (logistica?.pedido as Record<string, any> | undefined)?.TIPO_ENTREGA_DESCRICAO,
  ]
    .map(toStringValue)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toUpperCase());

const hasEntregaNoAto = (pedido: Record<string, unknown>, logistica?: Record<string, unknown>) => {
  const direto = [
    pedido.ENTREGA_NO_ATO,
    pedido.entrega_no_ato,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.ENTREGA_NO_ATO,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.entrega_no_ato,
    logistica?.ENTREGA_NO_ATO,
    logistica?.entrega_no_ato,
    (logistica?.pedido as Record<string, any> | undefined)?.ENTREGA_NO_ATO,
    (logistica?.pedido as Record<string, any> | undefined)?.entrega_no_ato,
  ];

  if (direto.some((value) => ['S', 'SIM', 'TRUE', '1'].includes(String(value ?? '').trim().toUpperCase()))) {
    return true;
  }

  const entregas = [
    ...(
      Array.isArray((pedido.logistica as Record<string, any> | undefined)?.entregas)
        ? ((pedido.logistica as Record<string, any>).entregas as Record<string, any>[])
        : []
    ),
    ...(Array.isArray(logistica?.entregas) ? (logistica.entregas as Record<string, any>[]) : []),
  ];

  return entregas.some((entrega) =>
    ['S', 'SIM', 'TRUE', '1'].includes(
      String(entrega?.ENTREGA_NO_ATO ?? entrega?.entrega_no_ato ?? '').trim().toUpperCase()
    )
  );
};

const isPedidoSomenteEntrega = (pedido: Record<string, unknown>, logistica?: Record<string, unknown>) => {
  const tiposEntrega = getTiposEntrega(pedido, logistica);
  if (hasEntregaNoAto(pedido, logistica)) return false;
  return tiposEntrega.some((tipo) => ['ENT', 'EPG'].includes(tipo));
};

const getTipoEntregaPrincipal = (pedido: Record<string, unknown>, logistica?: Record<string, unknown>) =>
  getTiposEntrega(pedido, logistica)[0] || null;

const isPedidoPermitidoNoDashboard = (pedido: Record<string, unknown>, logistica?: Record<string, unknown>) => {
  const tiposEntrega = getTiposEntrega(pedido, logistica);
  if (tiposEntrega.length === 0) return false;
  return isPedidoSomenteEntrega(pedido, logistica);
};

const getPedidoId = (pedido: Record<string, unknown>) =>
  toNumber(
    pedido.pedido_id ??
      pedido.ORCAMENTO_ID ??
      pedido.orcamento_id ??
      pedido.ORCAMENTO_BASE_ID ??
      pedido.orcamento_base_id ??
      pedido.PEDIDO_ID ??
      pedido.ID ??
      pedido.id
  );

const getNotaDoPedido = (nota: Record<string, unknown>) => {
  const notaFiscal =
    (nota.nota_fiscal as Record<string, unknown> | undefined) ||
    (nota.notaFiscal as Record<string, unknown> | undefined) ||
    nota;
  const pedido =
    (nota.pedido as Record<string, unknown> | undefined) ||
    (nota.pedido_venda as Record<string, unknown> | undefined) ||
    (nota.pedidoVenda as Record<string, unknown> | undefined) ||
    nota;

  return {
    pedidoId: getPedidoId(pedido),
    numeroNota: pickString(
      notaFiscal.NUMERO_NOTA,
      notaFiscal.NUMERO_NOTA_FISCAL,
      notaFiscal.numero,
      notaFiscal.NUMERO,
      notaFiscal.numeroNota
    ),
    chave: onlyDigits(
      pickString(notaFiscal.IDENTIFICACAO_NFE, notaFiscal.CHAVE_NFE, notaFiscal.codigo)
    ),
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  const requestStartedAt = new Date().toISOString();
  const forceRefresh = String(req.query.force || '').trim() === '1';
  const escopoPrincipal = String(req.query.escopo || '').trim() === 'principal';

  let periodoFiltro: ReturnType<typeof getPeriodoFiltro>;
  try {
    periodoFiltro = getPeriodoFiltro(req);
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'periodo_invalido'
        ? 'Data inicial nao pode ser maior que a data final.'
        : 'Periodo informado invalido.';
    return res.status(400).json({ error: message });
  }

  if (!username || !password) {
    const cacheFallback = getCacheByPeriodo(periodoFiltro.cacheKey);
    if (cacheFallback) {
      return res.status(200).json({ ...cacheFallback.payload, stale: true });
    }

    return res.status(503).json({
      error: 'Credenciais da API externa nao configuradas. Nao ha cache anterior para exibir o dashboard.',
    });
  }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const cacheAtual = getCacheByPeriodo(periodoFiltro.cacheKey);

  if (!forceRefresh) {
    // A tabela local e a fonte preferencial; a API externa alimenta o snapshot.
    const snapshotLocal = await montarDashboardPorSnapshot(periodoFiltro);
    if (snapshotLocal) {
      setCacheByPeriodo(periodoFiltro.cacheKey, snapshotLocal);
      return res.status(200).json(snapshotLocal);
    }

    // Mesmo sem snapshot recente, aproveitamos o cache em memoria antes da API.
    if (cacheAtual && cacheAtual.staleAt > Date.now()) {
      return res.status(200).json({
        ...cacheAtual.payload,
        cached: true,
        stale: cacheAtual.expiresAt <= Date.now(),
      });
    }
  }

  try {
    const dataFimDashboard = periodoFiltro.dataFimIso || undefined;
    const timings: Record<string, number> = {};
    const timed = async <T,>(name: string, request: Promise<T>) => {
      const startedAt = Date.now();
      try {
        return await request;
      } finally {
        timings[name] = Date.now() - startedAt;
      }
    };
    const [dashboardExterno, pedidosComTipoResult, notasCompletasResult, notasEmControles] =
      await Promise.all([
      timed('dashboard_externo', listarDashboardComRetry(
        {
          empresa_id: 1,
          data_inicio: periodoFiltro.dataInicioIso || undefined,
          data_fim: dataFimDashboard,
        },
        username,
        password,
        escopoPrincipal ? 10_000 : 8_000
      )),
      timed('pedidos_tipo', getPedidosDashboard(
        username,
        password,
        escopoPrincipal ? 100 : 500,
        8_000,
        {
          data_inicio: periodoFiltro.dataInicioIso || undefined,
          data_fim: dataFimDashboard,
        }
      )),
      timed(
        'notas_externas',
        // Sempre buscar notas externas para poder vincular com controles locais
        // mesmo em escopo principal, mas com limite menor
        apiExternaService.listarNotasFiscaisCompletas(
          { limit: escopoPrincipal ? 100 : 500, offset: 0 },
          username,
          password,
          escopoPrincipal ? 4_000 : 6_000
        ).catch(() => null) // Se falhar em escopo principal, continua sem notas
      ),
      timed('notas_locais', prisma.notaFiscal.findMany({
        where: {
          controleId: { not: null },
          ...(periodoFiltro.dataInicio || periodoFiltro.dataFim
            ? {
                controle: {
                  dataCriacao: {
                    ...(periodoFiltro.dataInicio ? { gte: periodoFiltro.dataInicio } : {}),
                    ...(periodoFiltro.dataFim
                      ? {
                          lte: new Date(
                            periodoFiltro.dataFim.getFullYear(),
                            periodoFiltro.dataFim.getMonth(),
                            periodoFiltro.dataFim.getDate(),
                            23,
                            59,
                            59,
                            999
                          ),
                        }
                      : {}),
                  },
                },
              }
            : {}),
        },
        select: {
          numeroNota: true,
          codigo: true,
          dataCriacao: true,
          controle: {
            select: {
              dataCriacao: true,
              numeroManifesto: true,
              transportadora: true,
            },
          },
        },
        orderBy: { dataCriacao: 'desc' },
        take: MAX_NOTAS_EM_CONTROLE_DETALHE,
      })),
    ]);
    res.setHeader(
      'Server-Timing',
      Object.entries(timings).map(([name, duration]) => `${name};dur=${duration}`).join(', ')
    );

    if (!dashboardExterno || !Array.isArray(dashboardExterno.data)) {
      throw new Error('api_externa_dashboard_periodo_indisponivel');
    }

    const pedidosComTipo = pedidosComTipoResult || [];
    const dashboardEntries = [
      ...(dashboardExterno.data as Record<string, unknown>[]),
      ...pedidosComTipo,
    ].filter((item, index, entries) => {
      const pedidoId = getPedidoId(item);
      return !pedidoId || entries.findIndex((candidate) => getPedidoId(candidate) === pedidoId) === index;
    });
    const notasCompletas = notasCompletasResult || null;
    const dashboardPedidoIds = new Set(
      (dashboardExterno.data as Record<string, unknown>[])
        .map((item) => getPedidoId(item))
        .filter((pedidoId): pedidoId is number => Boolean(pedidoId))
    );
    const tipoEntregaPorPedido = new Map<number, string>();
    for (const pedidoTipo of pedidosComTipo || []) {
      const pedidoId = getPedidoId(pedidoTipo);
      const tipoEntrega = pickString(
        pedidoTipo.TIPO_ENTREGA,
        pedidoTipo.tipo_entrega,
        pedidoTipo.tipoEntrega,
        pedidoTipo.TIPO_ENTREGA_DESCRICAO,
        pedidoTipo.tipo_entrega_descricao
      );
      if (pedidoId && tipoEntrega) tipoEntregaPorPedido.set(pedidoId, tipoEntrega);
    }

    const totalTiposCorrespondentes = Array.from(dashboardPedidoIds).filter((pedidoId) =>
      tipoEntregaPorPedido.has(pedidoId)
    ).length;
    if (dashboardPedidoIds.size > 0 && totalTiposCorrespondentes === 0) {
      throw new Error('tipos_pedidos_indisponiveis');
    }

    const pedidosRetiradosIds = new Set<number>();
    for (const pedido of dashboardEntries) {
      const pedidoId = getPedidoId(pedido);
      const tipoEntrega = pedidoId
        ? tipoEntregaPorPedido.get(pedidoId) || getTipoEntregaPrincipal(pedido, (pedido.logistica || {}) as Record<string, any>)
        : null;
      if (pedidoId && (['ATO', 'NDF', 'RDL', 'RLR'].includes(String(tipoEntrega || '').toUpperCase()) || hasEntregaNoAto(pedido))) {
        pedidosRetiradosIds.add(pedidoId);
      }
    }

    const notaPorPedido = new Map<number, { numeroNota: string | null; chave: string }>();
    for (const dashboardItem of dashboardExterno.data as Record<string, any>[]) {
      const pedidoId = getPedidoId(dashboardItem);
      const logistica = (dashboardItem.logistica || {}) as Record<string, any>;
      const nota = Array.isArray(logistica.notas_fiscais) ? logistica.notas_fiscais[0] || {} : {};
      const pedidoLogistica = (logistica.pedido || {}) as Record<string, any>;
      const numeroNota = pickString(
        dashboardItem.NUMERO_NOTA,
        dashboardItem.numero_nota,
        pedidoLogistica.NUMERO_NOTA,
        nota.NUMERO_NOTA,
        nota.NUMERO_NOTA_FISCAL
      );
      const chave = onlyDigits(
        pickString(
          dashboardItem.IDENTIFICACAO_NFE,
          dashboardItem.identificacao_nfe,
          pedidoLogistica.IDENTIFICACAO_NFE,
          nota.IDENTIFICACAO_NFE,
          nota.CHAVE_NFE
        )
      );
      if (pedidoId && (numeroNota || chave.length === 44)) {
        notaPorPedido.set(pedidoId, { numeroNota, chave });
      }
    }
    for (const nota of notasCompletas?.data || []) {
      const referencia = getNotaDoPedido(nota);
      if (referencia.pedidoId && !notaPorPedido.has(referencia.pedidoId)) {
        notaPorPedido.set(referencia.pedidoId, referencia);
      }
    }

    const controleInfoPorNumeroNota = new Map<string, ControleVinculoInfo>();
    const controleInfoPorChaveNota = new Map<string, ControleVinculoInfo>();
    for (const nota of notasEmControles) {
      const controleInfo: ControleVinculoInfo = {
        numeroManifesto: nota.controle?.numeroManifesto || null,
        transportadoraNome: nota.controle?.transportadora ? String(nota.controle.transportadora) : null,
        dataHoraControle: nota.controle?.dataCriacao?.toISOString?.() || nota.dataCriacao?.toISOString?.() || null,
      };
      const numeroNormalizado = normalizeNumeroNota(nota.numeroNota);
      const chaveNormalizada = onlyDigits(nota.codigo);
      if (numeroNormalizado) controleInfoPorNumeroNota.set(numeroNormalizado, controleInfo);
      if (chaveNormalizada) controleInfoPorChaveNota.set(chaveNormalizada, controleInfo);
    }

    const numerosEmbarcados = new Set(controleInfoPorNumeroNota.keys());
    const chavesEmbarcadas = new Set(controleInfoPorChaveNota.keys());
    const isNotaEmControle = (referencia: { numeroNota: string | null; chave: string } | null) =>
      Boolean(
        referencia &&
          ((referencia.numeroNota &&
            numerosEmbarcados.has(normalizeNumeroNota(referencia.numeroNota))) ||
            (referencia.chave.length === 44 && chavesEmbarcadas.has(referencia.chave)))
      );
    const getControleInfoByReferencia = (referencia: { numeroNota: string | null; chave: string } | null) => {
      if (!referencia) return null;
      if (referencia.chave.length === 44) {
        const porChave = controleInfoPorChaveNota.get(referencia.chave);
        if (porChave) return porChave;
      }
      if (referencia.numeroNota) {
        const porNumero = controleInfoPorNumeroNota.get(normalizeNumeroNota(referencia.numeroNota));
        if (porNumero) return porNumero;
        
        // Tentar também busca pelo número bruto (sem normalização) para casos onde notasCompletas é null
        const porNumeroBruto = controleInfoPorNumeroNotaBruto.get(String(referencia.numeroNota).trim());
        if (porNumeroBruto) return porNumeroBruto;
      }
      return null;
    };

    const pedidosEmbarcadosPorNota = new Set<number>();
    const pedidosEmbarcadosLocais = new Map<number, DashboardPedidoItem>();

    for (const nota of notasCompletas?.data || []) {
      const referencia = getNotaDoPedido(nota);
      if (referencia.pedidoId && isNotaEmControle(referencia)) {
        pedidosEmbarcadosPorNota.add(referencia.pedidoId);
      }
    }

    const notaCompletaPorChave = new Map<string, Record<string, any>>();
    const notaCompletaPorNumero = new Map<string, Record<string, any>>();
    for (const nota of notasCompletas?.data || []) {
      const referencia = getNotaDoPedido(nota);
      if (referencia.chave) notaCompletaPorChave.set(referencia.chave, nota);
      if (referencia.numeroNota) notaCompletaPorNumero.set(normalizeNumeroNota(referencia.numeroNota), nota);
    }

    // Criar mapa adicional de controleInfo indexado por número de nota SEM normalização
    // para melhor busca quando notasCompletas é null
    const controleInfoPorNumeroNotaBruto = new Map<string, ControleVinculoInfo>();
    for (const nota of notasEmControles) {
      const controleInfo: ControleVinculoInfo = {
        numeroManifesto: nota.controle?.numeroManifesto || null,
        transportadoraNome: nota.controle?.transportadora ? String(nota.controle.transportadora) : null,
        dataHoraControle: nota.controle?.dataCriacao?.toISOString?.() || nota.dataCriacao?.toISOString?.() || null,
      };
      // Indexar também pelo número bruto para busca melhor
      controleInfoPorNumeroNotaBruto.set(String(nota.numeroNota), controleInfo);
    }

    for (const notaLocal of notasEmControles) {
      const notaExterna =
        notaCompletaPorChave.get(onlyDigits(notaLocal.codigo)) ||
        notaCompletaPorNumero.get(normalizeNumeroNota(notaLocal.numeroNota));
      if (!notaExterna) {
        const numeroNotaLocal = normalizeNumeroNota(notaLocal.numeroNota);
        const pedidoIdLocal = toNumber(numeroNotaLocal);
        if (pedidoIdLocal && !pedidosEmbarcadosLocais.has(pedidoIdLocal)) {
          const controleInfo =
            getControleInfoByReferencia({
              numeroNota: notaLocal.numeroNota,
              chave: onlyDigits(notaLocal.codigo),
            }) || null;
          pedidosEmbarcadosLocais.set(pedidoIdLocal, {
            pedidoId: pedidoIdLocal,
            tipoEntrega: 'EPG',
            clienteNome: `Nota fiscal ${notaLocal.numeroNota}`,
            nomeFantasia: null,
            valorPedido: null,
            dataHoraRecebimento: notaLocal.dataCriacao?.toISOString?.() || null,
            previsaoEntrega: null,
            localNome: getControleLocalNome(controleInfo),
            statusCodigo: 'PEDIDOS_EMBARCADOS',
            statusDescricao: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
            statusSeparacao: STATUS_META.PEDIDOS_EMBARCADOS.statusSeparacao,
            situacaoAtual: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
            usuarioConfirmacaoNome: null,
            dataHoraConfirmacao: null,
            dataHoraControle: controleInfo?.dataHoraControle || null,
            transportadoraNome: controleInfo?.transportadoraNome || null,
            possuiProdutosFaltando: false,
            totalItensPendentes: 0,
            produtosPendentes: [],
          });
        }
        continue;
      }

      const pedidoId = getPedidoId(notaExterna);
      if (!pedidoId) continue;

      const tipoEntregaLocal =
        pickString(
          tipoEntregaPorPedido.get(pedidoId),
          notaExterna.TIPO_ENTREGA,
          notaExterna.tipo_entrega,
          notaExterna.tipoEntrega,
          notaExterna.TIPO_ENTREGA_DESCRICAO,
          notaExterna.tipo_entrega_descricao
        ) || null;
      if (
        !isPedidoPermitidoNoDashboard(
          {
            tipo_entrega: tipoEntregaLocal,
            TIPO_ENTREGA: tipoEntregaLocal,
          },
          undefined
        )
      ) {
        continue;
      }

      if (dashboardPedidoIds.has(pedidoId)) {
        pedidosEmbarcadosPorNota.add(pedidoId);
      }

      if (!pedidosEmbarcadosLocais.has(pedidoId)) {
        const controleInfo =
          getControleInfoByReferencia({
            numeroNota: notaLocal.numeroNota,
            chave: onlyDigits(notaLocal.codigo),
          }) || null;
        pedidosEmbarcadosLocais.set(pedidoId, {
          pedidoId,
          tipoEntrega: tipoEntregaLocal,
          ...dadosPedido(notaExterna),
          clienteNome: toStringValue(notaExterna.NOME_RAZAO_SOCIAL) || 'Cliente nao informado',
          nomeFantasia: toStringValue(notaExterna.NOME_FANTASIA),
          valorPedido: toNumber(notaExterna.VALOR_TOTAL_NOTA),
          dataHoraRecebimento:
            toStringValue(notaExterna.DATA_EMISSAO) ||
            toStringValue(notaExterna.DATA_CADASTRO),
          previsaoEntrega: toStringValue(notaExterna.DATA_ENTREGA),
          localNome: getControleLocalNome(controleInfo),
          statusCodigo: 'PEDIDOS_EMBARCADOS',
          statusDescricao: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
          statusSeparacao: STATUS_META.PEDIDOS_EMBARCADOS.statusSeparacao,
          situacaoAtual: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
          usuarioConfirmacaoNome: null,
          dataHoraConfirmacao: null,
          dataHoraControle: controleInfo?.dataHoraControle || null,
          transportadoraNome: controleInfo?.transportadoraNome || null,
          possuiProdutosFaltando: false,
          totalItensPendentes: 0,
          produtosPendentes: [],
        });
      }
    }

    type EnrichedDashboardEntry = {
      statusCodigo: StatusCode;
      item: DashboardPedidoItem;
      alertaStatus: StatusCode | null;
      possuiPendencia: boolean;
      embarcadoNoControle: boolean;
    };

    let detailedLookupCount = 0;

    const enrichDashboardEntries = async (sourceEntries: Record<string, unknown>[]) =>
      mapWithConcurrency(
        sourceEntries,
        DASHBOARD_ENRICH_CONCURRENCY,
        async (entry): Promise<EnrichedDashboardEntry | null> => {
          let pedido = entry as Record<string, unknown>;
          const pedidoId = toNumber(pedido.pedido_id);
          const statusLogistico = (pedido.status_logistico || {}) as Record<string, unknown>;
          let logistica = (pedido.logistica || {}) as Record<string, any>;
          const tipoEntregaInicial = getTipoEntregaPrincipal(pedido, logistica);
          const tipoEntregaLista = pedidoId ? tipoEntregaPorPedido.get(pedidoId) : undefined;
          const precisaLogisticaDetalhada =
            (!tipoEntregaInicial && !tipoEntregaLista) ||
            hasResumoPendenciaNoPedido(pedido);

          if (
            pedidoId &&
            precisaLogisticaDetalhada &&
            (hasResumoPendenciaNoPedido(pedido) || detailedLookupCount < MAX_LOGISTICA_LOOKUPS_PER_REQUEST)
          ) {
            detailedLookupCount += 1;
            const logisticaDetalhada = await getPedidoLogisticaCached(pedidoId, username, password);
            if (logisticaDetalhada) {
              logistica = { ...logistica, ...logisticaDetalhada };
            }
          }
          const statusCodigoBase = deriveDashboardStatus(pedido, statusLogistico, logistica);
          if (!pedidoId || !statusCodigoBase) {
            return null;
          }

          if (tipoEntregaLista) {
            pedido = {
              ...pedido,
              tipo_entrega: tipoEntregaLista,
              TIPO_ENTREGA: tipoEntregaLista,
            };
          }

          const previsaoEntrega = toStringValue(pedido.previsao_entrega);
          if (previsaoEntrega && previsaoEntrega.slice(0, 10) > DASHBOARD_PREVISAO_FINAL) {
            return null;
          }

          if (!isPedidoPermitidoNoDashboard(pedido, logistica)) {
            return null;
          }

          const possuiPendencia = isPedidoComPendencias(pedido, logistica);
          const ocultarNoCardSeparado =
            statusCodigoBase === 'PEDIDO_SEPARADO' && shouldOcultarPedidoNoCardSeparado(pedido, logistica);
          const statusCodigo = ocultarNoCardSeparado ? 'PEDIDO_EMBARCADO' : statusCodigoBase;
          const statusSeparacaoAtual = STATUS_META[statusCodigo].statusSeparacao;
          let referenciaNota = notaPorPedido.get(pedidoId) || null;

          if (!referenciaNota) {
            const notaLogistica = Array.isArray((logistica as Record<string, any>).notas_fiscais)
              ? (logistica as Record<string, any>).notas_fiscais[0] || {}
              : {};
            const pedidoLogistica = ((logistica as Record<string, any>).pedido || {}) as Record<string, any>;
            const numeroNota = pickString(
              pedidoLogistica.NUMERO_NOTA,
              notaLogistica.NUMERO_NOTA,
              notaLogistica.NUMERO_NOTA_FISCAL
            );
            const chave = onlyDigits(
              pickString(
                pedidoLogistica.IDENTIFICACAO_NFE,
                notaLogistica.IDENTIFICACAO_NFE,
                notaLogistica.CHAVE_NFE
              )
            );
            if (numeroNota || chave.length === 44) referenciaNota = { numeroNota, chave };
          }

          const embarcadoNoControle =
            pedidosEmbarcadosPorNota.has(pedidoId) || isNotaEmControle(referenciaNota);
          const controleInfo = getControleInfoByReferencia(referenciaNota);
          const produtosPendentes = possuiPendencia ? getProdutosPendentes(logistica, 'PENDENCIA') : [];

          const pedidoItem: DashboardPedidoItem = {
            statusOperacionalCodigo: embarcadoNoControle ? 'PEDIDOS_EMBARCADOS' : statusCodigo,
            ...dadosPedido(pedido, logistica),
            pedidoId,
            tipoEntrega: getTipoEntregaPrincipal(pedido, logistica),
            clienteNome: toStringValue(pedido.cliente_nome) || 'Cliente nao informado',
            nomeFantasia: toStringValue(pedido.nome_fantasia),
            valorPedido: toNumber(pedido.valor_pedido),
            dataHoraRecebimento: toStringValue(pedido.data_hora_recebimento),
            previsaoEntrega,
            localNome: embarcadoNoControle && controleInfo
              ? getControleLocalNome(controleInfo)
              : toStringValue(pedido.local_nome),
            statusCodigo,
            statusDescricao: STATUS_META[statusCodigo].titulo,
            statusSeparacao: statusSeparacaoAtual,
            situacaoAtual: STATUS_META[statusCodigo].titulo,
            usuarioConfirmacaoNome: toStringValue(statusLogistico.usuario_confirmacao_nome),
            dataHoraConfirmacao: toStringValue(statusLogistico.data_hora_confirmacao),
            dataHoraControle: controleInfo?.dataHoraControle || null,
            transportadoraNome: controleInfo?.transportadoraNome || null,
            possuiProdutosFaltando:
              possuiPendencia ||
              produtosPendentes.length > 0 ||
              isPedidoComPendencias(pedido, logistica),
            totalItensPendentes: produtosPendentes.length > 0
              ? produtosPendentes.reduce((acc, p) => acc + p.quantidade, 0)
              : possuiPendencia ? toNumber(pedido.total_itens_pendentes) || 0 : 0,
            produtosPendentes,
          };

          const alertaStatus = isPedidoParaAlerta(pedido)
            ? deriveAlertaStatus(statusCodigo, possuiPendencia, embarcadoNoControle)
            : null;

          return {
            statusCodigo,
            item: pedidoItem,
            alertaStatus,
            possuiPendencia,
            embarcadoNoControle,
          };
        }
      );

    const entradasValidas: EnrichedDashboardEntry[] = (await enrichDashboardEntries(dashboardEntries))
      .filter(
        (
          entry
        ): entry is {
          statusCodigo: StatusCode;
          item: DashboardPedidoItem;
          alertaStatus: StatusCode | null;
          possuiPendencia: boolean;
          embarcadoNoControle: boolean;
        } => Boolean(entry)
      );

    const embarquesAtuais = await buscarEmbarquesAtuais(entradasValidas.map(({ item }) => ({
      pedidoId: item.pedidoId,
      numeroNota: notaPorPedido.get(item.pedidoId)?.numeroNota,
      chaveNfe: notaPorPedido.get(item.pedidoId)?.chave,
      dataHoraRecebimento: item.dataHoraRecebimento ? new Date(item.dataHoraRecebimento) : null,
    })), username, password);
    for (const entry of entradasValidas) {
      const controle = embarquesAtuais.porPedido.get(entry.item.pedidoId);
      if (!controle) continue;
      entry.embarcadoNoControle = true;
      entry.alertaStatus = null;
      entry.item.statusOperacionalCodigo = 'PEDIDOS_EMBARCADOS';
      entry.item.dataHoraControle = controle.dataHoraControle?.toISOString() || null;
      entry.item.transportadoraNome = controle.transportadoraNome;
      entry.item.localNome = controle.numeroManifesto ? `Controle ${controle.numeroManifesto}` : entry.item.localNome;
    }
    const entradasPendenciasGlobais = entradasValidas;

    // Agrupar pedidos para os quadros de alerta
    const alertaEntries: { statusCodigo: StatusCode; item: DashboardPedidoItem }[] = [];
    for (const entry of entradasValidas) {
      if (entry.alertaStatus && STATUS_META[entry.alertaStatus]) {
        alertaEntries.push({
          statusCodigo: entry.alertaStatus,
          item: {
            ...entry.item,
            statusCodigo: entry.alertaStatus,
            statusDescricao: STATUS_META[entry.alertaStatus].titulo,
            statusSeparacao: STATUS_META[entry.alertaStatus].statusSeparacao,
          },
        });
      }
    }

    const pendenciaPorPedido = new Map<number, DashboardPedidoItem>();
    for (const entry of [...entradasPendenciasGlobais, ...entradasValidas]) {
      if (
        !entry.possuiPendencia ||
        !isPedidoPermitidoNoDashboard(
          {
            tipo_entrega: entry.item.tipoEntrega,
            TIPO_ENTREGA: entry.item.tipoEntrega,
          },
          undefined
        )
      ) {
        continue;
      }
      if (!pendenciaPorPedido.has(entry.item.pedidoId)) {
        pendenciaPorPedido.set(entry.item.pedidoId, {
          ...entry.item,
          statusCodigo: 'PENDENCIAS',
          statusDescricao: STATUS_META.PENDENCIAS.titulo,
          statusSeparacao: STATUS_META.PENDENCIAS.statusSeparacao,
        });
      }
    }

    const pendenciaEntries = Array.from(pendenciaPorPedido.values()).map((item) => ({
        statusCodigo: 'PENDENCIAS' as StatusCode,
        item,
      }));

    const embarcadosEntries = entradasValidas
      .filter((entry) => entry.embarcadoNoControle)
      .map((entry) => ({
        statusCodigo: 'PEDIDOS_EMBARCADOS' as StatusCode,
        item: {
          ...entry.item,
          statusCodigo: 'PEDIDOS_EMBARCADOS',
          statusDescricao: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
          statusSeparacao: STATUS_META.PEDIDOS_EMBARCADOS.statusSeparacao,
        },
      }));
    const pedidosJaEmbarcados = new Set(embarcadosEntries.map((entry) => entry.item.pedidoId));
    const embarcadosLocaisEntries = Array.from(pedidosEmbarcadosLocais.values())
      .filter((item) => !pedidosJaEmbarcados.has(item.pedidoId))
      .map((item) => ({
        statusCodigo: 'PEDIDOS_EMBARCADOS' as StatusCode,
        item,
      }));

    const allEntries = [
      ...entradasValidas
        .filter((entry) => !entry.embarcadoNoControle)
        .map((e) => ({ statusCodigo: e.statusCodigo, item: e.item })),
      ...pendenciaEntries,
      ...embarcadosEntries,
      ...embarcadosLocaisEntries,
      ...alertaEntries,
    ].filter((entry) =>
      isPedidoPermitidoNoDashboard(
        {
          tipo_entrega: entry.item.tipoEntrega,
          TIPO_ENTREGA: entry.item.tipoEntrega,
        },
        undefined
      )
    );

    const indicadores: DashboardStatusItem[] = STATUS_ORDER.map((statusCode) => {
      const pedidosStatus = allEntries
        .filter((entry) => entry.statusCodigo === statusCode)
        .map((entry) => entry.item)
        .sort((a, b) => b.pedidoId - a.pedidoId);

      return {
        ...STATUS_META[statusCode],
        total: pedidosStatus.length,
        pedidos: pedidosStatus,
      };
    });

    const totalPedidos = indicadores.reduce((acc, item) => acc + item.total, 0);
    const totalEmbarcados = indicadores.find((item) => item.codigo === 'PEDIDOS_EMBARCADOS')?.total || 0;
    const notasLocaisUnicas = new Set(
      notasEmControles.map((nota) => `${normalizeNumeroNota(nota.numeroNota)}:${onlyDigits(nota.codigo)}`)
    );
    const totalEmbarcadosComBaseLocal = Math.max(totalEmbarcados, notasLocaisUnicas.size);
    const embarcadosPorTransportadora: Record<string, number> = {
      ACCERT: 0,
      'EXPRESSO GOIAS': 0,
      ZANUELLO: 0,
      DETAFRA: 0,
      TERCEIRIZADA: 0,
    };
    const notasTransportadorasContadas = new Set<string>();
    for (const nota of notasEmControles) {
      const transportadora = String(nota.controle?.transportadora || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
      const nome = transportadora.includes('ACCERT')
        ? 'ACCERT'
        : transportadora.includes('EXPRESSO') || transportadora.includes('GOIAS')
          ? 'EXPRESSO GOIAS'
          : transportadora.includes('ZANUELLO') || transportadora.includes('ZANUELO') || transportadora.includes('ZANEULO')
            ? 'ZANUELLO'
            : transportadora.includes('DETAFRA')
              ? 'DETAFRA'
              : transportadora.includes('TERCEIRIZADA')
                ? 'TERCEIRIZADA'
                : null;
      const chave = `${normalizeNumeroNota(nota.numeroNota)}:${onlyDigits(nota.codigo)}:${nome || 'OUTRA'}`;
      if (nome && !notasTransportadorasContadas.has(chave)) {
        notasTransportadorasContadas.add(chave);
        embarcadosPorTransportadora[nome] += 1;
      }
    }
    const totalPendencias = indicadores.find((item) => item.codigo === 'PENDENCIAS')?.total || 0;

    const payload: DashboardResponse = {
      warning: embarquesAtuais.verificacaoIncompleta ? 'Alguns vinculos de embarque nao puderam ser atualizados.' : undefined,
      generatedAt: requestStartedAt,
      filtros: {
        localProduto: 'Pedidos recebidos no caixa - Empresa 1',
        dataInicio: periodoFiltro.dataInicioIso,
        dataFim: periodoFiltro.dataFimIso || DASHBOARD_PREVISAO_FINAL,
      },
      resumo: {
        totalPedidos,
        totalEmbarcados: totalEmbarcadosComBaseLocal,
        totalPendentes: totalPedidos - totalEmbarcadosComBaseLocal,
        totalPendencias,
        pedidosRetirados: pedidosRetiradosIds.size,
        transportadoras: embarcadosPorTransportadora,
      },
      indicadores,
    };

    setCacheByPeriodo(periodoFiltro.cacheKey, payload);

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[Dashboard Logistica Inicial] Erro:', error);
    const cacheStale = getCacheByPeriodo(periodoFiltro.cacheKey);

    if (cacheStale && cacheStale.staleAt > Date.now()) {
      return res.status(200).json({ ...cacheStale.payload, stale: true });
    }

    const snapshotFallback = await montarDashboardPorSnapshot(periodoFiltro, {
      warning: 'API externa indisponivel. Exibindo ultima base local sincronizada.',
    });

    if (snapshotFallback) {
      setCacheByPeriodo(periodoFiltro.cacheKey, snapshotFallback);
      return res.status(200).json(snapshotFallback);
    }

    return res.status(200).json(
      getEmptyDashboardPayload('API externa indisponivel. O dashboard sera atualizado quando o servico retornar.')
    );
  }
}
