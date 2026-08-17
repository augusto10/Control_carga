import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';
import prisma from '@/lib/prisma';
import { fetchMergedTracking, hasPortalCredentials } from '@/services/sswTracking';

const DASHBOARD_PREVISAO_FINAL = '2050-12-31';
const DEFAULT_CACHE_KEY = 'sem-inicio:sem-fim';
const DASHBOARD_CACHE_TTL_MS = 30_000;
const DASHBOARD_STALE_TTL_MS = 2 * 60_000;
const DELIVERY_STATUS_CACHE_TTL_MS = 5 * 60_000;
const CONFIRMATION_PREFIX = 'entrega_confirmacao:';
const STATUS_ORDER = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'AGUARDANDO_CONFERENCIA',
  'PRONTO_PARA_EMBARQUE',
  'PEDIDO_EMBARCADO',
] as const;

type StatusCode = (typeof STATUS_ORDER)[number];

type DashboardPedidoItem = {
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
    totalAguardandoConferencia: number;
  };
  indicadores: DashboardStatusItem[];
  cached?: boolean;
  stale?: boolean;
  warning?: string;
};

const STATUS_META: Record<StatusCode, Omit<DashboardStatusItem, 'total' | 'pedidos'>> = {
  PEDIDO_NOVO: {
    codigo: 'PEDIDO_NOVO',
    titulo: 'Pedidos Novos',
    descricao: 'Status da separacao de pendencias: ABERTO',
    statusSeparacao: 'ABERTO',
  },
  PEDIDO_EM_SEPARACAO: {
    codigo: 'PEDIDO_EM_SEPARACAO',
    titulo: 'Pedidos em Separacao',
    descricao: 'Status da separacao de pendencias: EM SEPARACAO',
    statusSeparacao: 'EM SEPARACAO',
  },
  PEDIDO_SEPARADO: {
    codigo: 'PEDIDO_SEPARADO',
    titulo: 'Pedidos Separados',
    descricao: 'Status da separacao de pendencias: SEPARADO',
    statusSeparacao: 'SEPARADO',
  },
  AGUARDANDO_CONFERENCIA: {
    codigo: 'AGUARDANDO_CONFERENCIA',
    titulo: 'Aguardando Conferencia',
    descricao: 'Status da separacao de pendencias: SEP., AG. GER. ENT.',
    statusSeparacao: 'SEP., AG. GER. ENT.',
  },
  PRONTO_PARA_EMBARQUE: {
    codigo: 'PRONTO_PARA_EMBARQUE',
    titulo: 'Prontos para Embarque',
    descricao: 'Status da separacao de pendencias: ENT. GERADA',
    statusSeparacao: 'ENT. GERADA',
  },
  PEDIDO_EMBARCADO: {
    codigo: 'PEDIDO_EMBARCADO',
    titulo: 'Pedidos Embarcados',
    descricao: 'Usuario de confirmacao com data e hora',
    statusSeparacao: 'EMBARCADO',
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
const deliveryStatusCache = new Map<
  number,
  {
    expiresAt: number;
    payload: DashboardPedidoItem['entregaStatus'];
  }
>();

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

const getDeliveryStatusLabel = (
  status: 'EM_PREPARACAO' | 'ENVIADO_TRANSPORTADORA' | 'EM_ROTA_ENTREGA' | 'PEDIDO_ENTREGUE'
) => {
  switch (status) {
    case 'EM_PREPARACAO':
      return 'Em preparacao';
    case 'ENVIADO_TRANSPORTADORA':
      return 'Enviado para transportadora';
    case 'EM_ROTA_ENTREGA':
      return 'Em rota de entrega';
    case 'PEDIDO_ENTREGUE':
      return 'Pedido entregue';
    default:
      return status;
  }
};

type DeliveryConfirmationInfo = {
  controleId: string;
  numeroNota: string;
  entregue: boolean;
  dataConfirmacao: string | null;
  recebedor: string | null;
  observacao: string | null;
};

const buildConfirmationKey = (controleId: string, numeroNota: string) =>
  `${controleId}:${normalizeNumeroNota(numeroNota)}`;

const parseDeliveryConfirmation = (value: string): DeliveryConfirmationInfo | null => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const controleId = pickString(parsed.controleId);
    const numeroNota = pickString(parsed.numeroNota);
    if (!controleId || !numeroNota) return null;
    return {
      controleId,
      numeroNota,
      entregue: Boolean(parsed.entregue),
      dataConfirmacao: pickString(parsed.dataConfirmacao),
      recebedor: pickString(parsed.recebedor),
      observacao: pickString(parsed.observacao),
    };
  } catch {
    return null;
  }
};

const getNumeroNotaFromNota = (nota: Record<string, unknown> | null): string | null => {
  if (!nota) return null;
  const notaFiscal =
    (nota.nota_fiscal as Record<string, unknown> | undefined) ||
    (nota.notaFiscal as Record<string, unknown> | undefined) ||
    nota;

  return pickString(
    notaFiscal.NUMERO_NOTA,
    notaFiscal.NUMERO_NOTA_FISCAL,
    notaFiscal.numero,
    notaFiscal.NUMERO,
    notaFiscal.numeroNota,
    notaFiscal.NOTA_FISCAL_NUMERO,
    notaFiscal.NF_NUMERO
  );
};

const getIdentificacaoNfe = (
  pedido: Record<string, unknown>,
  notaPrincipal: Record<string, unknown> | null
) => {
  const chave = onlyDigits(
    pickString(
      pedido.IDENTIFICACAO_NFE,
      pedido.CHAVE_NFE,
      pedido.identificacao_nfe,
      notaPrincipal?.IDENTIFICACAO_NFE,
      notaPrincipal?.CHAVE_NFE
    )
  );
  return chave.length === 44 ? chave : null;
};

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

const resolveEntregaStatus = async (
  pedidoId: number,
  username: string,
  password: string,
  confirmationMap: Map<string, DeliveryConfirmationInfo>,
  sswEnabled: boolean
): Promise<DashboardPedidoItem['entregaStatus']> => {
  const cached = deliveryStatusCache.get(pedidoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  try {
    const logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password, 8_000);
    const pedido = ((logistica?.pedido as Record<string, unknown>) || {}) as Record<string, unknown>;
    const notas = Array.isArray(logistica?.notas_fiscais)
      ? (logistica.notas_fiscais as Array<Record<string, unknown>>)
      : [];
    const notaPrincipal = notas[0] || null;
    const numeroNota =
      pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL, getNumeroNotaFromNota(notaPrincipal)) || null;
    const identificacaoNfe = getIdentificacaoNfe(pedido, notaPrincipal);

    const notaWhereClauses: Array<Record<string, unknown>> = [];
    if (identificacaoNfe) notaWhereClauses.push({ codigo: identificacaoNfe });
    if (numeroNota) {
      notaWhereClauses.push({ numeroNota });
      notaWhereClauses.push({ numeroNota: normalizeNumeroNota(numeroNota) });
    }

    const notaLocal =
      notaWhereClauses.length > 0
        ? await prisma.notaFiscal.findFirst({
            where: { OR: notaWhereClauses as any },
            include: {
              controle: {
                select: {
                  id: true,
                  transportadora: true,
                },
              },
            },
          })
        : null;

    const controleId = notaLocal?.controleId || null;
    const confirmacaoEntrega =
      controleId && numeroNota
        ? confirmationMap.get(buildConfirmationKey(controleId, numeroNota))
        : null;

    if (confirmacaoEntrega?.entregue) {
      const payload: DashboardPedidoItem['entregaStatus'] = {
        codigo: 'PEDIDO_ENTREGUE',
        label: getDeliveryStatusLabel('PEDIDO_ENTREGUE'),
        sswStatus: 'ENTREGA_CONFIRMADA',
        sswMensagem: confirmacaoEntrega.observacao || 'Entrega confirmada manualmente',
        dataHoraEntrega: confirmacaoEntrega.dataConfirmacao,
        recebedor: confirmacaoEntrega.recebedor,
      };
      deliveryStatusCache.set(pedidoId, {
        expiresAt: Date.now() + DELIVERY_STATUS_CACHE_TTL_MS,
        payload,
      });
      return payload;
    }

    if (!identificacaoNfe || !controleId || !sswEnabled) {
      const fallbackCode = controleId ? 'ENVIADO_TRANSPORTADORA' : 'EM_PREPARACAO';
      const payload: DashboardPedidoItem['entregaStatus'] = {
        codigo: fallbackCode,
        label: getDeliveryStatusLabel(fallbackCode),
        sswStatus: null,
        sswMensagem: !identificacaoNfe ? 'Pedido sem chave NF-e para consultar rastreio' : null,
        dataHoraEntrega: null,
        recebedor: null,
      };
      deliveryStatusCache.set(pedidoId, {
        expiresAt: Date.now() + DELIVERY_STATUS_CACHE_TTL_MS,
        payload,
      });
      return payload;
    }

    const tracking = await fetchMergedTracking({
      chave: identificacaoNfe,
      numeroNota,
      transportadora: notaLocal?.controle?.transportadora || null,
    });

    const code = tracking.found
      ? tracking.delivered
        ? 'PEDIDO_ENTREGUE'
        : 'EM_ROTA_ENTREGA'
      : 'ENVIADO_TRANSPORTADORA';

    const payload: DashboardPedidoItem['entregaStatus'] = {
      codigo: code,
      label: getDeliveryStatusLabel(code),
      sswStatus: tracking.status,
      sswMensagem: tracking.message,
      dataHoraEntrega: tracking.deliveredAt,
      recebedor: tracking.receiverName,
    };

    deliveryStatusCache.set(pedidoId, {
      expiresAt: Date.now() + DELIVERY_STATUS_CACHE_TTL_MS,
      payload,
    });

    return payload;
  } catch {
    return null;
  }
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

const deriveDashboardStatus = (
  pedido: Record<string, unknown>,
  statusLogistico: Record<string, unknown>
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
  const itensGerar = toNumber(pedido.itens_gerar) || 0;

  if (entregaConfirmada) {
    return 'PEDIDO_EMBARCADO';
  }

  if (ultimoStatusSeparacao === 'A') {
    return 'PEDIDO_NOVO';
  }

  if (ultimoStatusSeparacao === 'R') {
    return 'AGUARDANDO_CONFERENCIA';
  }

  if (ultimoStatusSeparacao === 'S') {
    return 'PEDIDO_EM_SEPARACAO';
  }

  if (ultimoStatusSeparacao === 'G' && ultimaEntregaId) {
    return 'PRONTO_PARA_EMBARQUE';
  }

  if (ultimoStatusSeparacao === 'G' || ultimoStatusSeparacao === 'E') {
    return 'PEDIDO_SEPARADO';
  }

  if (itensGerar > 0) {
    return 'AGUARDANDO_CONFERENCIA';
  }

  if (statusSeparacoes.has('G') && ultimaEntregaId) {
    return 'PRONTO_PARA_EMBARQUE';
  }

  if (statusSeparacoes.has('G') || statusSeparacoes.has('E')) {
    return 'PEDIDO_SEPARADO';
  }

  return statusApi && STATUS_ORDER.includes(statusApi as StatusCode) ? (statusApi as StatusCode) : null;
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
  const separacoesAtivas = Array.isArray(logistica?.separacoes)
    ? logistica.separacoes.filter((separacao: Record<string, any>) =>
        ['S', 'A', 'ATIVO'].includes(String(separacao.STATUS ?? '').toUpperCase())
      )
    : [];

  if (!status.includes('SEP.') || !status.includes('AG. GER. ENT.') || separacoesAtivas.length < 2) {
    return [];
  }

  const itens = [
    ...(Array.isArray(logistica?.itens_entregas_pendentes) ? logistica.itens_entregas_pendentes : []),
    ...(Array.isArray(logistica?.itens_separacoes) ? logistica.itens_separacoes : []),
  ];
  const agrupados = new Map<string, { produtoId: number | null; codigo: string | null; nome: string; quantidade: number }>();

  for (const item of itens as Record<string, any>[]) {
    const quantidade =
      toNumber(item.SALDO) ??
      Math.max(0, (toNumber(item.QUANTIDADE) || 0) - (toNumber(item.QUANTIDADE_BAIXADA) || 0));
    if (quantidade <= 0) continue;

    const produtoId = toNumber(item.PRODUTO_ID);
    const codigo = toStringValue(item.CODIGO_ORIGINAL) || toStringValue(item.CODIGO_BARRAS);
    const nome = toStringValue(item.PRODUTO_NOME) || 'Produto nao informado';
    const chave = String(produtoId ?? codigo ?? nome);
    const atual = agrupados.get(chave);
    if (atual) atual.quantidade += quantidade;
    else agrupados.set(chave, { produtoId, codigo, nome, quantidade });
  }

  return Array.from(agrupados.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

const buildEmptyResponse = (warning?: string): DashboardResponse => ({
  generatedAt: new Date().toISOString(),
  filtros: {
    localProduto: 'Pedidos recebidos no caixa - Empresa 1',
    dataInicio: null,
    dataFim: DASHBOARD_PREVISAO_FINAL,
  },
  resumo: {
    totalPedidos: 0,
    totalEmbarcados: 0,
    totalPendentes: 0,
    totalAguardandoConferencia: 0,
  },
  indicadores: STATUS_ORDER.map((statusCode) => ({
    ...STATUS_META[statusCode],
    total: 0,
    pedidos: [],
  })),
  ...(warning ? { warning } : {}),
});

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
  const forceRefresh = String(req.query.force || '').trim() === '1';

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
    return res.status(200).json(buildEmptyResponse('API externa nao configurada.'));
  }

  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
  const cacheAtual = getCacheByPeriodo(periodoFiltro.cacheKey);

  // Mesmo a atualizacao manual respeita o cache curto para nao sobrecarregar a API externa.
  if (!forceRefresh && cacheAtual && cacheAtual.expiresAt > Date.now()) {
    return res.status(200).json({ ...cacheAtual.payload, cached: true });
  }

  try {
    const confirmacaoRows = await prisma.configuracaoSistema.findMany({
      where: { chave: { startsWith: CONFIRMATION_PREFIX } },
      select: { valor: true },
    });
    const confirmationMap = new Map<string, DeliveryConfirmationInfo>();
    for (const row of confirmacaoRows) {
      const item = parseDeliveryConfirmation(row.valor);
      if (!item?.entregue) continue;
      confirmationMap.set(buildConfirmationKey(item.controleId, item.numeroNota), item);
    }
    const sswEnabled = hasPortalCredentials();

    const dashboardExterno = await apiExternaService.listarDashboardLogistica(
      {
        empresa_id: 1,
        data_inicio: periodoFiltro.dataInicioIso || undefined,
        data_fim: periodoFiltro.dataFimIso || undefined,
      },
      username,
      password,
      15_000
    );

    if (!dashboardExterno || !Array.isArray(dashboardExterno.data)) {
      throw new Error('api_externa_indisponivel');
    }
    const enrichedEntries = await mapWithConcurrency(
      dashboardExterno.data as Record<string, unknown>[],
      4,
      async (entry) => {
        const pedido = entry as Record<string, unknown>;
        const pedidoId = toNumber(pedido.pedido_id);
        const statusLogistico = (pedido.status_logistico || {}) as Record<string, unknown>;
        const statusCodigo = deriveDashboardStatus(pedido, statusLogistico);
        if (!pedidoId || !statusCodigo) {
          return null;
        }

        const previsaoEntrega = toStringValue(pedido.previsao_entrega);
        if (previsaoEntrega && previsaoEntrega.slice(0, 10) > DASHBOARD_PREVISAO_FINAL) {
          return null;
        }

        const retirada =
          pedido.retirada && typeof pedido.retirada === 'object'
            ? {
                foiRetirado: Boolean((pedido.retirada as Record<string, unknown>).foi_retirado),
                dataHoraRetirada: toStringValue(
                  (pedido.retirada as Record<string, unknown>).data_hora_retirada
                ),
                usuarioRetirada: toStringValue(
                  (pedido.retirada as Record<string, unknown>).usuario_retirada
                ),
                usuarioRetiradaNome: toStringValue(
                  (pedido.retirada as Record<string, unknown>).usuario_retirada_nome
                ),
                nomePessoaRecebeu: toStringValue(
                  (pedido.retirada as Record<string, unknown>).nome_pessoa_recebeu
                ),
                origem: toStringValue((pedido.retirada as Record<string, unknown>).origem),
              }
            : null;

        const entregaStatus =
          statusCodigo === 'PEDIDO_EMBARCADO' && !retirada?.foiRetirado
            ? await resolveEntregaStatus(pedidoId, username, password, confirmationMap, sswEnabled)
            : null;

        return {
          statusCodigo: statusCodigo as StatusCode,
          item: {
            pedidoId,
            clienteNome: toStringValue(pedido.cliente_nome) || 'Cliente nao informado',
            nomeFantasia: toStringValue(pedido.nome_fantasia),
            valorPedido: toNumber(pedido.valor_pedido),
            dataHoraRecebimento: toStringValue(pedido.data_hora_recebimento),
            previsaoEntrega,
            localNome: toStringValue(pedido.local_nome),
            statusCodigo,
            statusDescricao: STATUS_META[statusCodigo].titulo,
            statusSeparacao: STATUS_META[statusCodigo].statusSeparacao,
            usuarioConfirmacaoNome: toStringValue(statusLogistico.usuario_confirmacao_nome),
            dataHoraConfirmacao: toStringValue(statusLogistico.data_hora_confirmacao),
            retirada,
            entregaStatus,
            possuiProdutosFaltando: Boolean(pedido.possui_produtos_faltando),
            totalItensPendentes: toNumber(pedido.total_itens_pendentes) || 0,
            produtosPendentes: [],
          } as DashboardPedidoItem,
        };
      }
    );

    const entradasValidas: { statusCodigo: StatusCode; item: DashboardPedidoItem }[] = enrichedEntries
      .filter(
        (
          entry
        ): entry is {
          statusCodigo: StatusCode;
          item: DashboardPedidoItem;
        } => Boolean(entry)
      );

    const indicadores: DashboardStatusItem[] = STATUS_ORDER.map((statusCode) => {
      const pedidosStatus = entradasValidas
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
    const totalEmbarcados = indicadores.find((item) => item.codigo === 'PEDIDO_EMBARCADO')?.total || 0;
    const totalAguardandoConferencia =
      indicadores.find((item) => item.codigo === 'AGUARDANDO_CONFERENCIA')?.total || 0;

    const payload: DashboardResponse = {
      generatedAt: new Date().toISOString(),
      filtros: {
        localProduto: 'Pedidos recebidos no caixa - Empresa 1',
        dataInicio: periodoFiltro.dataInicioIso,
        dataFim: periodoFiltro.dataFimIso || DASHBOARD_PREVISAO_FINAL,
      },
      resumo: {
        totalPedidos,
        totalEmbarcados,
        totalPendentes: totalPedidos - totalEmbarcados,
        totalAguardandoConferencia,
      },
      indicadores,
    };

    dashboardCache = {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      staleAt: Date.now() + DASHBOARD_STALE_TTL_MS,
      payload,
    };
    dashboardCacheByPeriodo.set(periodoFiltro.cacheKey, dashboardCache);

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[Dashboard Logistica Inicial] Erro:', error);
    const cacheStale = getCacheByPeriodo(periodoFiltro.cacheKey);

    if (cacheStale && cacheStale.staleAt > Date.now()) {
      return res.status(200).json({
        ...cacheStale.payload,
        stale: true,
        warning: 'Painel logistico indisponivel no momento. Exibindo o ultimo resultado em cache.',
      });
    }

    const fallback = buildEmptyResponse(
      'Painel logistico indisponivel no momento. Tente atualizar em alguns instantes.'
    );

    // Evita novas tentativas a cada render enquanto a API externa estiver fora do ar.
    dashboardCache = {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      staleAt: Date.now() + DASHBOARD_STALE_TTL_MS,
      payload: fallback,
    };
    dashboardCacheByPeriodo.set(periodoFiltro.cacheKey, dashboardCache);

    return res.status(200).json(fallback);
  }
}
