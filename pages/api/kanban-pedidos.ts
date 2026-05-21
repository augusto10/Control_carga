import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService, type ApuracaoExterna } from '@/services/api-externa';
import { consultarNotaFiscal, trackingDanfe } from '@/services/sswClient';
import { createHash } from 'crypto';

const KANBAN_STATUSES = [
  'EM_PREPARACAO',
  'ENVIADO_TRANSPORTADORA',
  'EM_ROTA_ENTREGA',
  'PEDIDO_ENTREGUE',
] as const;

type KanbanStatus = typeof KANBAN_STATUSES[number];

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

type PedidoKanbanBase = Omit<PedidoKanban, 'status' | 'statusLabel' | 'observacaoStatus'>;

type PedidosExternosResponse = {
  data?: Array<Record<string, unknown>>;
  total?: number;
};

type TrackingInfo = {
  found: boolean;
  delivered: boolean;
  status: string | null;
  message: string | null;
};

type KanbanCacheEntry = {
  payload: KanbanResponse;
  expiresAt: number;
  staleAt: number;
};

type PersistedKanbanCacheRow = {
  payload: KanbanResponse;
  expiresAt: Date;
  staleAt: Date;
};

const kanbanResponseCache = new Map<string, KanbanCacheEntry>();

function getKanbanCacheKey(dataReferencia: string): string {
  return `kanban:v2:${dataReferencia}`;
}

function getPersistedKanbanCacheConfigKey(cacheKey: string): string {
  const hash = createHash('sha1').update(cacheKey).digest('hex');
  return `kanban_query_cache:${hash}`;
}

function getKanbanCacheTtlMs(dataReferencia: string): { freshMs: number; staleMs: number } {
  const hoje = getDateInSaoPaulo();

  if (dataReferencia < hoje) {
    return {
      freshMs: 30 * 60 * 1000,
      staleMs: 12 * 60 * 60 * 1000,
    };
  }

  return {
    freshMs: 60 * 1000,
    staleMs: 10 * 60 * 1000,
  };
}

function getPersistedKanbanCacheTtlMs(dataReferencia: string): { freshMs: number; staleMs: number } {
  const hoje = getDateInSaoPaulo();

  if (dataReferencia < hoje) {
    return {
      freshMs: 6 * 60 * 60 * 1000,
      staleMs: 3 * 24 * 60 * 60 * 1000,
    };
  }

  return {
    freshMs: 5 * 60 * 1000,
    staleMs: 60 * 60 * 1000,
  };
}

function setKanbanCache(dataReferencia: string, payload: KanbanResponse): KanbanResponse {
  const now = Date.now();
  const ttl = getKanbanCacheTtlMs(dataReferencia);

  kanbanResponseCache.set(getKanbanCacheKey(dataReferencia), {
    payload,
    expiresAt: now + ttl.freshMs,
    staleAt: now + ttl.staleMs,
  });

  return payload;
}

async function readPersistedKanbanCache(cacheKey: string): Promise<PersistedKanbanCacheRow | null> {
  try {
    const cache = await prisma.configuracaoSistema.findUnique({
      where: { chave: getPersistedKanbanCacheConfigKey(cacheKey) },
    });

    if (!cache?.valor) return null;

    const parsed = JSON.parse(cache.valor) as {
      cacheKey?: string;
      payload?: KanbanResponse;
      expiresAt?: string;
      staleAt?: string;
    };

    if (parsed.cacheKey !== cacheKey || !parsed.payload || !parsed.expiresAt || !parsed.staleAt) {
      return null;
    }

    return {
      payload: parsed.payload,
      expiresAt: new Date(parsed.expiresAt),
      staleAt: new Date(parsed.staleAt),
    };
  } catch (error) {
    console.error('[Kanban Cache] Falha ao ler cache persistente:', error);
    return null;
  }
}

async function writePersistedKanbanCache(
  cacheKey: string,
  payload: KanbanResponse,
  dataReferencia: string
): Promise<void> {
  try {
    const ttl = getPersistedKanbanCacheTtlMs(dataReferencia);
    const valor = JSON.stringify({
      cacheKey,
      payload,
      expiresAt: new Date(Date.now() + ttl.freshMs).toISOString(),
      staleAt: new Date(Date.now() + ttl.staleMs).toISOString(),
    });

    await prisma.configuracaoSistema.upsert({
      where: { chave: getPersistedKanbanCacheConfigKey(cacheKey) },
      create: {
        chave: getPersistedKanbanCacheConfigKey(cacheKey),
        valor,
        descricao: 'Cache persistente de consultas do kanban de pedidos',
        tipo: 'json',
        editavel: false,
      },
      update: { valor },
    });
  } catch (error) {
    console.error('[Kanban Cache] Falha ao gravar cache persistente:', error);
  }
}

function getDateInSaoPaulo(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function addDays(dateRef: string, days: number): string {
  const date = new Date(`${dateRef}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pickString(...values: Array<unknown>): string | null {
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
}

function pickNumber(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const normalized = trimmed.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function onlyDigits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeNumeroNota(value: string | null | undefined): string {
  const digits = onlyDigits(value);
  if (!digits) {
    return String(value || '').trim().toLowerCase();
  }
  return digits.replace(/^0+/, '') || '0';
}

function normalizeFreeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasMeaningfulExternalValue(value: unknown): boolean {
  const text = pickString(value);
  if (!text) return false;

  const normalized = normalizeFreeText(text);
  return !['null', 'undefined', 'none', 'nan'].includes(normalized);
}

function isPedidoFechado(pedido: Record<string, unknown>): boolean {
  const fechado = pickString(
    pedido.PEDIDO_FECHADO,
    pedido.pedido_fechado,
    pedido.FECHADO,
    pedido.fechado
  );

  return String(fechado || '').trim().toUpperCase() === 'S';
}

function isPedidoRecebidoNoCaixa(pedido: Record<string, unknown>): boolean {
  return [
    pedido.DATA_HORA_RECEBIMENTO,
    pedido.data_hora_recebimento,
    pedido.DATA_RECEBIMENTO,
    pedido.data_recebimento,
    pedido.RECEBIMENTO,
    pedido.recebimento,
    pedido.DATA_HORA_RECEBIDO,
    pedido.data_hora_recebido,
    pedido.DATA_RECEBIDO,
    pedido.data_recebido,
    pedido.DATA_RECEB,
    pedido.data_receb,
    pedido.HORA_RECEBIMENTO,
    pedido.hora_recebimento,
    pedido.HORA_RECEB,
    pedido.hora_receb,
  ].some(hasMeaningfulExternalValue);
}

function isPedidoFechadoERecebidoNoCaixa(pedido: Record<string, unknown>): boolean {
  return isPedidoFechado(pedido) && isPedidoRecebidoNoCaixa(pedido);
}

function getStatusLabel(status: KanbanStatus): string {
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
}

function buildPedidoKanban(
  base: PedidoKanbanBase,
  status: KanbanStatus,
  observacaoStatus: string | null
): PedidoKanban {
  return {
    ...base,
    status,
    statusLabel: getStatusLabel(status),
    observacaoStatus,
  };
}

function getBaseUrl(req: NextApiRequest): string {
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host}`;
}

function buildInternalRequestHeaders(req: NextApiRequest): HeadersInit {
  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (typeof req.headers.cookie === 'string' && req.headers.cookie.trim()) {
    headers.cookie = req.headers.cookie;
  }

  return headers;
}

function extractPedidoId(pedido: Record<string, unknown>): number {
  return (
    pickNumber(
      pedido.ORCAMENTO_ID,
      pedido.ORCAMENTO_BASE_ID,
      pedido.PEDIDO_ID,
      pedido.ID,
      pedido.orcamento_id,
      pedido.orcamento_base_id,
      pedido.pedido_id,
      pedido.id
    ) ||
    0
  );
}

function enrichPedidoWithApuracao(
  pedido: Record<string, unknown>,
  apuracao?: ApuracaoExterna
): Record<string, unknown> {
  if (!apuracao) return pedido;

  return {
    ...pedido,
    NUMERO_NOTA:
      pickString(
        pedido.NUMERO_NOTA,
        apuracao.NUMERO_NOTA,
        (apuracao as Record<string, unknown>).NUMERO_NOTA_FISCAL
      ) || null,
    IDENTIFICACAO_NFE:
      pickString(
        pedido.IDENTIFICACAO_NFE,
        apuracao.IDENTIFICACAO_NFE,
        (apuracao as Record<string, unknown>).CHAVE_NFE
      ) || null,
  };
}

function extractNumeroNotaFromExternalNota(nota: Record<string, unknown> | null): string | null {
  if (!nota) return null;
  return pickString(
    nota.NUMERO_NOTA,
    nota.numero,
    nota.NUMERO,
    nota.numeroNota,
    nota.NOTA_FISCAL_NUMERO,
    nota.NF_NUMERO
  );
}

function enrichPedidoWithNotaFiscal(
  pedido: Record<string, unknown>,
  nota?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!nota) return pedido;

  return {
    ...pedido,
    NUMERO_NOTA:
      pickString(
        pedido.NUMERO_NOTA,
        pedido.NUMERO_NOTA_FISCAL,
        nota.NUMERO_NOTA,
        nota.numero,
        nota.NUMERO
      ) || null,
    IDENTIFICACAO_NFE:
      pickString(
        pedido.IDENTIFICACAO_NFE,
        pedido.CHAVE_NFE,
        nota.IDENTIFICACAO_NFE,
        nota.CHAVE_NFE,
        nota.chave
      ) || null,
  };
}

function enrichPedidoWithExternalNota(
  pedido: Record<string, unknown>,
  nota?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!nota) return pedido;

  return {
    ...pedido,
    NUMERO_NOTA:
      pickString(
        pedido.NUMERO_NOTA,
        pedido.NUMERO_NOTA_FISCAL,
        nota.NUMERO_NOTA,
        nota.NUMERO_NOTA_FISCAL,
        nota.numero,
        nota.NUMERO
      ) || null,
    IDENTIFICACAO_NFE:
      pickString(
        pedido.IDENTIFICACAO_NFE,
        pedido.CHAVE_NFE,
        nota.IDENTIFICACAO_NFE,
        nota.CHAVE_NFE,
        nota.chave
      ) || null,
  };
}

function enrichPedidoWithLocalNotaPorPedido(
  pedido: Record<string, unknown>,
  notaLocalPorPedido?: {
    numeroNota: string;
    codigo: string;
    controleId: string | null;
    controleDataCriacao: Date | null;
    controleTransportadora: string | null;
  } | null
): Record<string, unknown> {
  if (!notaLocalPorPedido) return pedido;

  return {
    ...pedido,
    NUMERO_NOTA:
      pickString(
        pedido.NUMERO_NOTA,
        pedido.NUMERO_NOTA_FISCAL,
        notaLocalPorPedido.numeroNota
      ) || null,
    IDENTIFICACAO_NFE:
      pickString(
        pedido.IDENTIFICACAO_NFE,
        pedido.CHAVE_NFE,
        notaLocalPorPedido.codigo
      ) || null,
  };
}

function extractTrackingText(data: Record<string, unknown>): string {
  const direct = pickString(
    data.mensagem,
    data.MENSAGEM,
    data.descricao,
    data.DESCRICAO,
    data.status,
    data.STATUS,
    data.situacao,
    data.SITUACAO
  );

  if (direct) return direct;

  for (const value of Object.values(data)) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value) && value.length > 0) {
      const last = value[value.length - 1];
      if (last && typeof last === 'object') {
        const nested = extractTrackingText(last as Record<string, unknown>);
        if (nested) return nested;
      }
    }
  }

  return '';
}

function parseTrackingEventDateMs(event: Record<string, unknown>): number {
  const raw =
    pickString(event.data_hora_efetiva, event.data_hora, event.DATA_HORA_EFETIVA, event.DATA_HORA) ||
    null;

  if (!raw) return -1;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getTime();
}

function isTrackingEventLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;

  return Boolean(
    pickString(
      event.ocorrencia,
      event.OCORRENCIA,
      event.descricao,
      event.DESCRICAO,
      event.data_hora,
      event.DATA_HORA,
      event.data_hora_efetiva,
      event.DATA_HORA_EFETIVA
    )
  );
}

function extractTrackingEvents(payload: unknown): Array<Record<string, unknown>> {
  const visited = new Set<unknown>();

  const dfs = (node: unknown, depth: number): Array<Record<string, unknown>> | null => {
    if (!node || typeof node !== 'object') return null;
    if (visited.has(node) || depth > 8) return null;
    visited.add(node);

    if (Array.isArray(node)) {
      const events = node.filter(isTrackingEventLike) as Array<Record<string, unknown>>;
      if (events.length > 0) return events;

      for (const item of node) {
        const found = dfs(item, depth + 1);
        if (found?.length) return found;
      }

      return null;
    }

    const objectNode = node as Record<string, unknown>;
    for (const value of Object.values(objectNode)) {
      const found = dfs(value, depth + 1);
      if (found?.length) return found;
    }

    return null;
  };

  return dfs(payload, 0) ?? [];
}

function parseTrackingInfo(data: Record<string, unknown>): TrackingInfo {
  const events = extractTrackingEvents(data).sort(
    (a, b) => parseTrackingEventDateMs(a) - parseTrackingEventDateMs(b)
  );
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  const status =
    pickString(
      data.status,
      data.STATUS,
      data.situacao,
      data.SITUACAO,
      latestEvent?.ocorrencia,
      latestEvent?.OCORRENCIA,
      latestEvent?.tipo,
      latestEvent?.TIPO
    ) || null;

  const message =
    pickString(
      latestEvent?.descricao,
      latestEvent?.DESCRICAO,
      latestEvent?.ocorrencia,
      latestEvent?.OCORRENCIA
    ) ||
    extractTrackingText(data) ||
    null;

  const normalized = normalizeFreeText(
    `${status || ''} ${message || ''} ${
      latestEvent
        ? pickString(
            latestEvent.ocorrencia,
            latestEvent.OCORRENCIA,
            latestEvent.descricao,
            latestEvent.DESCRICAO
          ) || ''
        : ''
    }`
  );

  const delivered =
    normalized.includes('entregue') ||
    normalized.includes('entrega realizada') ||
    normalized.includes('mercadoria entregue') ||
    normalized.includes('recebido pelo destinatario') ||
    normalized.includes('baixado');

  const notFound =
    normalized.includes('nenhum documento localizado') ||
    normalized.includes('nenhum documento') ||
    normalized.includes('nao encontrado') ||
    normalized.includes('nao localizada') ||
    normalized.includes('inexistente');

  return {
    found: !notFound,
    delivered,
    status,
    message,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function runWorker() {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}

async function fetchPedidosDoDia(
  req: NextApiRequest,
  dataReferencia: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const pedidosConsolidados: Array<Record<string, unknown>> = [];
  const seenConsolidados = new Set<number>();
  const consultaLimit = 100;

  for (let offset = 0; offset < 5000; offset += consultaLimit) {
    const resultado = await apiExternaService.listarConsultaNotasFiscais(
      {
        limit: consultaLimit,
        offset,
        data_inicio: dataReferencia,
        data_fim: dataReferencia,
        tipo_data: 'recebimento',
        tipo_entrega: 'EPG',
        status: 'FECHADO',
      },
      username,
      password
    );

    if (!resultado) break;

    const page = Array.isArray(resultado.data) ? resultado.data : [];
    for (const item of page) {
      const pedidoId = extractPedidoId(item);
      if (!pedidoId || seenConsolidados.has(pedidoId)) continue;
      seenConsolidados.add(pedidoId);
      pedidosConsolidados.push({
        ...item,
        _KANBAN_CONSULTA_CONSOLIDADA: true,
      });
    }

    if (page.length < consultaLimit) return pedidosConsolidados;
    if (typeof resultado.total === 'number' && resultado.total > 0 && offset + page.length >= resultado.total) {
      return pedidosConsolidados;
    }
  }

  if (pedidosConsolidados.length > 0) {
    return pedidosConsolidados;
  }

  const baseUrl = getBaseUrl(req);
  const pedidos: Array<Record<string, unknown>> = [];
  const seen = new Set<number>();
  const limit = 100;
  const dataInicio = dataReferencia;

  for (let offset = 0; offset < 5000; offset += limit) {
    const url = new URL('/api/pedidos/externos', baseUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('data_inicio', dataInicio);
    url.searchParams.set('data_fim', dataReferencia);
    url.searchParams.set('tipo_data', 'recebimento');
    url.searchParams.set('tipo_entrega', 'EPG');
    url.searchParams.set('status', 'FECHADO');

    const response = await fetch(url.toString(), {
      headers: buildInternalRequestHeaders(req),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar pedidos externos (${response.status})`);
    }

    const payload = (await response.json()) as PedidosExternosResponse;
    const page = Array.isArray(payload.data) ? payload.data : [];

    for (const item of page) {
      const pedidoId = extractPedidoId(item);
      if (!pedidoId || seen.has(pedidoId)) continue;
      seen.add(pedidoId);
      pedidos.push(item);
    }

    // A API intermediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ria filtra localmente e pode devolver uma pÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡gina vazia
    // mesmo quando ainda existem pedidos em offsets seguintes.
    if (page.length > 0 && page.length < limit) break;
    if (typeof payload.total === 'number' && payload.total > 0 && offset + page.length >= payload.total) {
      break;
    }
  }

  return pedidos;
}

async function fetchApuracoesFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataReferencia: string
): Promise<Map<number, ApuracaoExterna>> {
  const missingIds = pedidos
    .filter((pedido) => {
      const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
      const chave = pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE);
      return !numeroNota || onlyDigits(chave).length !== 44;
    })
    .map(extractPedidoId)
    .filter((id) => id > 0);

  if (missingIds.length === 0) {
    return new Map<number, ApuracaoExterna>();
  }

  const missingSet = new Set(missingIds);
  const apuracaoMap = new Map<number, ApuracaoExterna>();
  const dataInicio = addDays(dataReferencia, -45);
  const dataFim = addDays(dataReferencia, 2);
  const batchLimit = 200;

  for (let offset = 0; offset < 5000; offset += batchLimit) {
    const resultado = await apiExternaService.listarApuracoes(
      {
        data_inicio: dataInicio,
        data_fim: dataFim,
        limit: batchLimit,
        offset,
      },
      username,
      password
    );

    const itens = resultado?.data || [];
    if (itens.length === 0) break;

    for (const apuracao of itens) {
      const id =
        pickNumber(
          apuracao.ORCAMENTO_BASE_ID,
          (apuracao as Record<string, unknown>).ORCAMENTO_ID,
          (apuracao as Record<string, unknown>).ORCAMENTO
        ) || 0;

      if (id > 0 && missingSet.has(id) && !apuracaoMap.has(id)) {
        apuracaoMap.set(id, apuracao);
      }
    }

    if (itens.length < batchLimit) break;
    if (apuracaoMap.size >= missingSet.size) break;
  }

  return apuracaoMap;
}

async function fetchNotasFiscaisFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataReferencia: string
): Promise<Map<number, Record<string, unknown>>> {
  const pendingIds = pedidos
    .filter((pedido) => {
      const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
      const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
      return !numeroNota || chave.length !== 44;
    })
    .map(extractPedidoId)
    .filter((id) => id > 0);

  if (pendingIds.length === 0) {
    return new Map<number, Record<string, unknown>>();
  }

  const pendingSet = new Set(pendingIds);
  const notaMap = new Map<number, Record<string, unknown>>();
  const dataInicio = addDays(dataReferencia, -45);
  const dataFim = addDays(dataReferencia, 2);

  const notas = await apiExternaService.listarNotasFiscais(
    {
      dataInicio,
      dataFim,
    },
    username,
    password
  );

  for (const nota of notas) {
    const notaRecord = nota as unknown as Record<string, unknown>;
    const pedidoId =
      pickNumber(
        notaRecord.ORCAMENTO_BASE_ID,
        notaRecord.ORCAMENTO_ID,
        notaRecord.PEDIDO_ID
      ) || 0;

    if (pedidoId > 0 && pendingSet.has(pedidoId) && !notaMap.has(pedidoId)) {
      notaMap.set(pedidoId, notaRecord);
    }
  }

  return notaMap;
}

async function fetchApuracoesPorPedidoFallback(
  pedidos: Array<Record<string, unknown>>,
  req: NextApiRequest
): Promise<Map<number, Record<string, unknown>>> {
  const pendingIds = pedidos
    .filter((pedido) => {
      const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
      const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
      return !numeroNota || chave.length !== 44;
    })
    .map(extractPedidoId)
    .filter((id) => id > 0);

  if (pendingIds.length === 0) {
    return new Map<number, Record<string, unknown>>();
  }

  const baseUrl = getBaseUrl(req);
  const entries = await mapWithConcurrency(
    Array.from(new Set(pendingIds)),
    8,
    async (pedidoId) => {
      try {
        const url = new URL(`/api/pedidos/apuracao/${pedidoId}`, baseUrl);
        const response = await fetch(url.toString(), {
          headers: buildInternalRequestHeaders(req),
          cache: 'no-store',
        });

        if (!response.ok) {
          return [pedidoId, null] as const;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        return [pedidoId, payload] as const;
      } catch {
        return [pedidoId, null] as const;
      }
    }
  );

  return new Map<number, Record<string, unknown>>(
    entries.filter((entry): entry is readonly [number, Record<string, unknown>] => Boolean(entry[1]))
  );
}

async function fetchLocalNotasPorPedidoSelecionado(
  dataReferencia: string
): Promise<
  Map<
    number,
    {
      numeroNota: string;
      codigo: string;
      controleId: string | null;
      controleDataCriacao: Date | null;
      controleTransportadora: string | null;
    }
  >
> {
  const start = new Date(`${dataReferencia}T00:00:00-03:00`);
  const end = new Date(`${addDays(dataReferencia, 7)}T23:59:59-03:00`);

  const notasLocais = await prisma.notaFiscal.findMany({
    where: {
      dataCriacao: {
        gte: start,
        lte: end,
      },
      controleId: {
        not: null,
      },
    },
    include: {
      controle: {
        select: {
          id: true,
          dataCriacao: true,
          transportadora: true,
        },
      },
    },
  });

  const notasComCodigo = notasLocais.filter((nota) => onlyDigits(nota.codigo).length === 44);
  const externalEntries = await mapWithConcurrency(notasComCodigo, 8, async (nota) => {
    try {
      const external = await consultarNotaFiscal(onlyDigits(nota.codigo));
      const pedidoId =
        pickNumber(
          external.ORCAMENTO_BASE_ID,
          external.ORCAMENTO_ID,
          external.PEDIDO_ID
        ) || 0;

      if (!pedidoId) return null;

      return [
        pedidoId,
        {
          numeroNota: nota.numeroNota,
          codigo: nota.codigo,
          controleId: nota.controleId,
          controleDataCriacao: nota.controle?.dataCriacao || null,
          controleTransportadora: nota.controle?.transportadora
            ? String(nota.controle.transportadora)
            : null,
        },
      ] as const;
    } catch {
      return null;
    }
  });

  return new Map(
    externalEntries.filter(
      (
        entry
      ): entry is readonly [
        number,
        {
          numeroNota: string;
          codigo: string;
          controleId: string | null;
          controleDataCriacao: Date | null;
          controleTransportadora: string | null;
        },
      ] => Boolean(entry)
    )
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KanbanResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

  try {
    const dataReferencia =
      typeof req.query.data === 'string' && req.query.data.trim()
        ? req.query.data.trim()
        : getDateInSaoPaulo();
    const forceRefresh = req.query.refresh === '1';
    const cacheKey = getKanbanCacheKey(dataReferencia);
    const cached = kanbanResponseCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now < cached.expiresAt) {
      res.setHeader('X-Kanban-Cache', 'fresh');
      return res.status(200).json(cached.payload);
    }

    if (!forceRefresh && cached && now < cached.staleAt) {
      res.setHeader('X-Kanban-Cache', 'stale');
      return res.status(200).json(cached.payload);
    }

    if (!forceRefresh) {
      const persistedCache = await readPersistedKanbanCache(cacheKey);
      if (persistedCache) {
        const persistedPayload = setKanbanCache(dataReferencia, persistedCache.payload);
        const persistedExpiresAt = persistedCache.expiresAt.getTime();
        const persistedStaleAt = persistedCache.staleAt.getTime();

        if (now < persistedExpiresAt) {
          res.setHeader('X-Kanban-Cache', 'persisted-fresh');
          return res.status(200).json(persistedPayload);
        }

        if (now < persistedStaleAt) {
          res.setHeader('X-Kanban-Cache', 'persisted-stale');
          return res.status(200).json(persistedPayload);
        }
      }
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({ error: 'Credenciais da API externa nao configuradas' });
    }

    const pedidosBase = (await fetchPedidosDoDia(req, dataReferencia, username, password)).filter((pedido) => {
      if (pedido._KANBAN_CONSULTA_CONSOLIDADA === true) return true;
      return isPedidoFechadoERecebidoNoCaixa(pedido);
    });
    const apuracaoMap = await fetchApuracoesFallback(pedidosBase, username, password, dataReferencia);
    const pedidosComApuracao = pedidosBase.map((pedido) =>
      enrichPedidoWithApuracao(pedido, apuracaoMap.get(extractPedidoId(pedido)))
    );
    const notaFiscalMap = await fetchNotasFiscaisFallback(
      pedidosComApuracao,
      username,
      password,
      dataReferencia
    );

    const pedidosComNotas = pedidosComApuracao.map((pedido) =>
      enrichPedidoWithNotaFiscal(pedido, notaFiscalMap.get(extractPedidoId(pedido)))
    );
    const apuracaoPorPedidoMap = await fetchApuracoesPorPedidoFallback(pedidosComNotas, req);
    const localNotasPorPedidoMap = await fetchLocalNotasPorPedidoSelecionado(dataReferencia);

    const pedidosEnriquecidos = pedidosComNotas.map((pedido) =>
      enrichPedidoWithNotaFiscal(pedido, apuracaoPorPedidoMap.get(extractPedidoId(pedido)))
    );

    const keysSemNumeroNota = Array.from(
      new Set(
        pedidosEnriquecidos
          .filter((pedido) => {
            const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
            const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
            return chave.length === 44 && !numeroNota;
          })
          .map((pedido) => onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE)))
          .filter((chave) => chave.length === 44)
      )
    );

    const notaExternaEntries = await mapWithConcurrency(keysSemNumeroNota, 8, async (chave) => {
      try {
        const nota = await consultarNotaFiscal(chave);
        return [chave, nota] as const;
      } catch {
        return [chave, null] as const;
      }
    });
    const notaExternaMap = new Map<string, Record<string, unknown> | null>(notaExternaEntries);
    const pedidosComNotasExternas = pedidosEnriquecidos.map((pedido) =>
      enrichPedidoWithExternalNota(
        pedido,
        notaExternaMap.get(onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE))) || null
      )
    );
    const pedidosComNotasLocaisPorPedido = pedidosComNotasExternas.map((pedido) =>
      enrichPedidoWithLocalNotaPorPedido(
        pedido,
        localNotasPorPedidoMap.get(extractPedidoId(pedido)) || null
      )
    );

    const numeroNotaCandidates = new Set<string>();
    const codigoCandidates = new Set<string>();

    for (const pedido of pedidosComNotasLocaisPorPedido) {
      const numeroNota =
        pickString(
          pedido.NUMERO_NOTA,
          pedido.NUMERO_NOTA_FISCAL,
          extractNumeroNotaFromExternalNota(
            notaExternaMap.get(onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE))) || null
          )
        ) || null;

      if (numeroNota) {
        numeroNotaCandidates.add(numeroNota);
        numeroNotaCandidates.add(normalizeNumeroNota(numeroNota));
      }

      const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
      if (chave.length === 44) {
        codigoCandidates.add(chave);
      }
    }

    const notaWhereClauses: any[] = [];
    if (numeroNotaCandidates.size > 0) {
      notaWhereClauses.push({ numeroNota: { in: Array.from(numeroNotaCandidates) } });
    }
    if (codigoCandidates.size > 0) {
      notaWhereClauses.push({ codigo: { in: Array.from(codigoCandidates) } });
    }

    const notasLocais = await prisma.notaFiscal.findMany({
      where: notaWhereClauses.length > 0 ? { OR: notaWhereClauses } : { id: { in: [] } },
      include: {
        controle: {
          select: {
            id: true,
            dataCriacao: true,
            transportadora: true,
          },
        },
      },
    });

    const notaPorNumero = new Map<string, (typeof notasLocais)[number]>();
    const notaPorCodigo = new Map<string, (typeof notasLocais)[number]>();

    for (const nota of notasLocais) {
      notaPorNumero.set(normalizeNumeroNota(nota.numeroNota), nota);
      notaPorCodigo.set(onlyDigits(nota.codigo), nota);
    }

    const sswEnabled = Boolean(
      process.env.SSW_ACCERT_DOMAIN &&
        process.env.SSW_ACCERT_USERNAME &&
        process.env.SSW_ACCERT_CNPJ_EDI &&
        process.env.SSW_ACCERT_PASSWORD
    );

    const chavesComControle = Array.from(
      new Set(
        pedidosComNotasLocaisPorPedido
          .map((pedido) => {
            const numeroNota =
              pickString(
                pedido.NUMERO_NOTA,
                pedido.NUMERO_NOTA_FISCAL,
                extractNumeroNotaFromExternalNota(
                  notaExternaMap.get(onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE))) || null
                )
              ) || null;
            const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
            const notaLocal =
              (numeroNota ? notaPorNumero.get(normalizeNumeroNota(numeroNota)) : undefined) ||
              notaPorCodigo.get(chave);
            const pedidoId = extractPedidoId(pedido);
            const notaLocalPorPedido = localNotasPorPedidoMap.get(pedidoId);
            const controleIdResolvido = notaLocal?.controleId || notaLocalPorPedido?.controleId || null;

            if (!controleIdResolvido || chave.length !== 44 || !sswEnabled) {
              return null;
            }

            return chave;
          })
          .filter((value): value is string => Boolean(value))
      )
    );

    const trackingEntries = await mapWithConcurrency(chavesComControle, 6, async (chave) => {
      try {
        const tracking = await trackingDanfe(chave);
        if (tracking.erro) {
          return [
            chave,
            {
              found: false,
              delivered: false,
              status: null,
              message: pickString(tracking.mensagem, (tracking as Record<string, unknown>).MENSAGEM),
            } satisfies TrackingInfo,
          ] as const;
        }

        return [chave, parseTrackingInfo(tracking)] as const;
      } catch (error) {
        return [
          chave,
          {
            found: false,
            delivered: false,
            status: null,
            message: error instanceof Error ? error.message : 'Erro ao consultar SSW',
          } satisfies TrackingInfo,
        ] as const;
      }
    });
    const trackingMap = new Map<string, TrackingInfo>(trackingEntries);

    const columns: Record<KanbanStatus, PedidoKanban[]> = {
      EM_PREPARACAO: [],
      ENVIADO_TRANSPORTADORA: [],
      EM_ROTA_ENTREGA: [],
      PEDIDO_ENTREGUE: [],
    };

    for (const pedido of pedidosComNotasLocaisPorPedido) {
      const pedidoId = extractPedidoId(pedido);
      if (!pedidoId) continue;

      const numeroNota =
        pickString(
          pedido.NUMERO_NOTA,
          pedido.NUMERO_NOTA_FISCAL,
          extractNumeroNotaFromExternalNota(
            notaExternaMap.get(onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE))) || null
          )
        ) || null;

      const identificacaoNfe = (() => {
        const raw = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
        return raw.length === 44 ? raw : null;
      })();

      const notaLocal =
        (numeroNota ? notaPorNumero.get(normalizeNumeroNota(numeroNota)) : undefined) ||
        (identificacaoNfe ? notaPorCodigo.get(identificacaoNfe) : undefined);
      const notaLocalPorPedido = localNotasPorPedidoMap.get(pedidoId);
      const controleIdResolvido = notaLocal?.controleId || notaLocalPorPedido?.controleId || null;
      const controleDataCriacaoResolvida =
        notaLocal?.controle?.dataCriacao || notaLocalPorPedido?.controleDataCriacao || null;
      const controleTransportadoraResolvida =
        notaLocal?.controle?.transportadora || notaLocalPorPedido?.controleTransportadora || null;

      const tracking = identificacaoNfe ? trackingMap.get(identificacaoNfe) : undefined;

      let status: KanbanStatus = 'EM_PREPARACAO';
      let observacaoStatus: string | null = null;

      if (controleIdResolvido) {
        status = 'ENVIADO_TRANSPORTADORA';
        observacaoStatus = 'Nota vinculada a um controle de carga';
      } else if (!numeroNota) {
        observacaoStatus = 'Pedido sem nota fiscal identificada ate o momento';
      } else {
        observacaoStatus = 'Nota encontrada, aguardando vinculo com controle de carga';
      }

      if (controleIdResolvido && tracking?.found) {
        status = tracking.delivered ? 'PEDIDO_ENTREGUE' : 'EM_ROTA_ENTREGA';
        observacaoStatus = tracking.delivered
          ? 'SSW retornou status de entrega concluida'
          : 'Nota localizada no sistema da SSW';
      }

      const itemBase: PedidoKanbanBase = {
        id: `pedido-${pedidoId}`,
        pedidoId,
        clienteId: pickNumber(pedido.CADASTRO_ID) || 0,
        clienteNome:
          pickString(pedido.CLIENTE_NOME, pedido.NOME_RAZAO_SOCIAL, pedido.NOME_FANTASIA, pedido.NOME) ||
          'Cliente nao identificado',
        vendedorId: pickNumber(pedido.VENDEDOR_ID) || 0,
        vendedorNome: pickString(pedido.VENDEDOR_NOME, pedido.NOME_REPRESENTANTE, pedido.NOME) || 'Sem representante',
        valor:
          pickNumber(
            pedido.VALOR_TOTAL,
            pedido.VALOR_PEDIDO,
            pedido.VALOR_TOTAL_NOTA,
            pedido.VALOR_PRODUTOS,
            pedido.VALOR_DUPLICATA
          ) || 0,
        dataHoraCadastro: pickString(
          pedido.DATA_HORA_CADASTRO,
          pedido.DATA_HORA_RECEBIMENTO,
          pedido.DATA_CADASTRO,
          pedido.DATA_EMISSAO
        ),
        dataEntrega: pickString(pedido.DATA_ENTREGA, pedido.DATA_HORA_ENTREGA),
        tipoEntrega: pickString(pedido.TIPO_ENTREGA),
        numeroNota,
        identificacaoNfe,
        controleId: controleIdResolvido,
        controleDataCriacao: controleDataCriacaoResolvida?.toISOString() || null,
        controleTransportadora: controleTransportadoraResolvida || null,
        sswStatus: tracking?.status || null,
        sswMensagem: tracking?.message || null,
      };

      columns[status].push(
        buildPedidoKanban(
          itemBase,
          status,
          status === 'EM_PREPARACAO'
            ? 'Pedido aguardando evolucao no fluxo de expedicao'
            : observacaoStatus
        )
      );
    }

    for (const status of KANBAN_STATUSES) {
      columns[status].sort((a, b) => {
        const dateA = new Date(a.dataHoraCadastro || 0).getTime();
        const dateB = new Date(b.dataHoraCadastro || 0).getTime();
        return dateA - dateB;
      });
    }

    const totals = {
      EM_PREPARACAO: columns.EM_PREPARACAO.length,
      ENVIADO_TRANSPORTADORA: columns.ENVIADO_TRANSPORTADORA.length,
      EM_ROTA_ENTREGA: columns.EM_ROTA_ENTREGA.length,
      PEDIDO_ENTREGUE: columns.PEDIDO_ENTREGUE.length,
    };

    const payload: KanbanResponse = {
      dataReferencia,
      dataInicio: dataReferencia,
      generatedAt: new Date().toISOString(),
      totals,
      columns,
    };

    setKanbanCache(dataReferencia, payload);
    await writePersistedKanbanCache(cacheKey, payload, dataReferencia);
    res.setHeader('X-Kanban-Cache', forceRefresh ? 'refresh' : 'miss');
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[API Kanban Pedidos] Erro:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro interno ao montar o kanban',
    });
  }
}
