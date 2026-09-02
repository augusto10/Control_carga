import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService, type ApuracaoExterna } from '@/services/api-externa';
import {
  fetchMergedTracking,
  hasPortalCredentials,
  type SswTrackingResult,
} from '@/services/sswTracking';
import { createHash } from 'crypto';

const CONFIRMATION_PREFIX = 'entrega_confirmacao:';

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
  separacaoStatus: string | null;
  separacaoStatusLabel: string | null;
  numeroNota: string | null;
  identificacaoNfe: string | null;
  controleId: string | null;
  controleDataCriacao: string | null;
  controleTransportadora: string | null;
  sswStatus: string | null;
  sswMensagem: string | null;
  trackingDeliveredAt: string | null;
  trackingReceiverName: string | null;
  trackingPhotoUrl: string | null;
  trackingOccurrences: Array<{
    dataHora: string | null;
    ocorrencia: string | null;
    descricao: string | null;
    cidade: string | null;
    dominio: string | null;
  }>;
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

type TrackingInfo = Pick<
  SswTrackingResult,
  'found' | 'delivered' | 'status' | 'message' | 'deliveredAt' | 'receiverName' | 'photoUrl' | 'occurrences'
>;

type DeliveryConfirmationInfo = {
  controleId: string;
  numeroNota: string;
  entregue: boolean;
  confirmadoPor: string | null;
  dataConfirmacao: string | null;
  observacao: string | null;
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
  return `kanban:v10:notas-completas:${dataReferencia}`;
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

function getPedidoEmpresaId(pedido: Record<string, unknown>): number | null {
  return pickNumber(pedido.EMPRESA_ID, pedido.EMPRESAID, pedido.ID_EMPRESA, pedido.EMPRESA);
}

function getPedidoDataReferenciaDia(pedido: Record<string, unknown>): string | null {
  const raw = pickString(
    pedido.DATA_HORA_RECEBIMENTO,
    pedido.data_hora_recebimento,
    pedido.DATA_RECEBIMENTO,
    pedido.data_recebimento,
    pedido.RECEBIMENTO,
    pedido.recebimento,
    pedido.PEDIDO_DATA_FECHAMENTO,
    pedido.pedido_data_fechamento,
    pedido.PEDIDO_DATA_CADASTRO,
    pedido.pedido_data_cadastro,
    pedido.DATA_EMISSAO,
    pedido.data_emissao
  );

  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const [datePart] = raw.split(' ');
    const [day, month, year] = datePart.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(raw)) {
    const [datePart] = raw.split(' ');
    const [day, month, year] = datePart.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isPedidoDoKanbanNaData(pedido: Record<string, unknown>, dataReferencia: string): boolean {
  const tipoEntrega = String(pedido.TIPO_ENTREGA || pedido.tipo_entrega || '').toUpperCase();
  const recebidoValor = String(pedido.RECEBIDO ?? pedido.recebido ?? '').trim().toUpperCase();
  const recebido = ['S', 'SIM', 'TRUE', '1'].includes(recebidoValor);
  const dataRecebimento = pickString(
    pedido.DATA_HORA_RECEBIMENTO,
    pedido.data_hora_recebimento,
    pedido.DATA_RECEBIMENTO,
    pedido.data_recebimento
  );

  return (
    getPedidoEmpresaId(pedido) === 1 &&
    ['EPG', 'ENT'].includes(tipoEntrega) &&
    recebido &&
    Boolean(dataRecebimento) &&
    Boolean(extractPedidoId(pedido)) &&
    getPedidoDataReferenciaDia(pedido) === dataReferencia
  );
}

function buildConfirmationKey(controleId: string, numeroNota: string): string {
  return `${controleId}:${normalizeNumeroNota(numeroNota)}`;
}

function parseDeliveryConfirmation(value: string): DeliveryConfirmationInfo | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const controleId = pickString(parsed.controleId);
    const numeroNota = pickString(parsed.numeroNota);

    if (!controleId || !numeroNota) return null;

    return {
      controleId,
      numeroNota,
      entregue: Boolean(parsed.entregue),
      confirmadoPor: pickString(parsed.confirmadoPor),
      dataConfirmacao: pickString(parsed.dataConfirmacao),
      observacao: pickString(parsed.observacao),
    };
  } catch {
    return null;
  }
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

function deriveSeparacaoStatus(pedido: Record<string, unknown>): string | null {
  const ultimoStatusSeparacao = pickString(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  const statusSeparacoes = new Set(
    String(pickString(pedido.status_separacoes) || '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  );
  const entregaConfirmada = String(pedido.entrega_confirmada || '').trim().toUpperCase() === 'S';

  if (entregaConfirmada) return 'G';
  if (ultimoStatusSeparacao && ['A', 'S', 'E', 'G'].includes(ultimoStatusSeparacao)) {
    return ultimoStatusSeparacao;
  }

  if (statusSeparacoes.has('G')) return 'G';
  if (statusSeparacoes.has('E')) return 'E';
  if (statusSeparacoes.has('S')) return 'S';
  if (statusSeparacoes.has('A')) return 'A';

  return null;
}

function getSeparacaoStatusLabel(status: string | null): string | null {
  switch (status) {
    case 'A':
      return 'Aguardando separacao';
    case 'S':
      return 'Em separacao';
    case 'E':
      return 'Separado aguardando conferencia';
    case 'G':
      return 'Conferido / entrega gerada';
    default:
      return null;
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
}

function extractNotaFiscalId(value: Record<string, unknown> | null | undefined): number | null {
  if (!value) return null;

  const notaFiscal =
    (value.nota_fiscal as Record<string, unknown> | undefined) ||
    (value.notaFiscal as Record<string, unknown> | undefined) ||
    value;

  return (
    pickNumber(
      value.NOTA_FISCAL_ID,
      value.nota_fiscal_id,
      value.ID_NOTA_FISCAL,
      value.id_nota_fiscal,
      notaFiscal.NOTA_FISCAL_ID,
      notaFiscal.ID_NOTA_FISCAL,
      notaFiscal.ID,
      notaFiscal.id
    ) || null
  );
}

function extractPedidoIdFromNotaCompleta(nota: Record<string, unknown>): number {
  const pedido =
    (nota.pedido as Record<string, unknown> | undefined) ||
    (nota.pedido_venda as Record<string, unknown> | undefined) ||
    (nota.pedidoVenda as Record<string, unknown> | undefined);
  return extractPedidoId(pedido || nota);
}

function getNotaCompletaDoPedido(
  notasMap: Map<number, Record<string, unknown>>,
  pedido: Record<string, unknown>
): Record<string, unknown> | null {
  const notaId = extractNotaFiscalId(pedido);
  const pedidoId = extractPedidoId(pedido);
  return (
    (notaId ? notasMap.get(notaId) : undefined) ||
    (pedidoId ? notasMap.get(-pedidoId) : undefined) ||
    null
  );
}

function enrichPedidoWithNotaFiscalCompleta(
  pedido: Record<string, unknown>,
  nota?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!nota) return pedido;

  const notaFiscal =
    (nota.nota_fiscal as Record<string, unknown> | undefined) ||
    (nota.notaFiscal as Record<string, unknown> | undefined) ||
    nota;
  const pedidoDaNota =
    (nota.pedido as Record<string, unknown> | undefined) ||
    (nota.pedido_venda as Record<string, unknown> | undefined) ||
    null;

  return {
    ...pedido,
    ...(pedidoDaNota || {}),
    NOTA_FISCAL_ID: extractNotaFiscalId(nota) ?? extractNotaFiscalId(pedido),
    NUMERO_NOTA:
      pickString(
        pedido.NUMERO_NOTA,
        pedido.NUMERO_NOTA_FISCAL,
        notaFiscal.NUMERO_NOTA,
        notaFiscal.NUMERO_NOTA_FISCAL,
        notaFiscal.numero,
        notaFiscal.NUMERO
      ) || null,
    IDENTIFICACAO_NFE:
      pickString(
        pedido.IDENTIFICACAO_NFE,
        pedido.CHAVE_NFE,
        notaFiscal.IDENTIFICACAO_NFE,
        notaFiscal.CHAVE_NFE,
        notaFiscal.CHAVE,
        notaFiscal.chave
      ) || null,
    DATA_EMISSAO:
      pickString(
        pedido.DATA_EMISSAO,
        notaFiscal.DATA_EMISSAO,
        notaFiscal.data_emissao,
        notaFiscal.DATA_HORA_EMISSAO
      ) || null,
    VALOR_TOTAL_NOTA:
      pickNumber(
        pedido.VALOR_TOTAL_NOTA,
        notaFiscal.VALOR_TOTAL_NOTA,
        notaFiscal.VALOR_TOTAL,
        notaFiscal.valor_total,
        notaFiscal.valor
      ) ?? null,
  };
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
  dataReferencia: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const dashboard = await apiExternaService.listarDashboardLogistica(
      {
        empresa_id: 1,
        data_inicio: dataReferencia,
        data_fim: dataReferencia,
      },
      username,
      password,
      8_000
    );

    const dashboardItems = Array.isArray(dashboard?.data)
      ? dashboard.data.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === 'object' &&
            Boolean(extractPedidoId(item as Record<string, unknown>))
        )
      : [];

    if (dashboardItems.length > 0) {
      const dashboardPorPedido = new Map<number, Record<string, unknown>>();
      for (const item of dashboardItems) {
        const pedidoId = extractPedidoId(item);
        if (pedidoId && !dashboardPorPedido.has(pedidoId)) {
          dashboardPorPedido.set(pedidoId, item);
        }
      }

      const pedidosEnriquecidos: Array<Record<string, unknown>> = [];
      const idsPendentes = new Set(dashboardPorPedido.keys());
      const limit = 100;

      for (let offset = 0; offset < 500 && idsPendentes.size > 0; offset += limit) {
        const resultado = await apiExternaService.listarPedidos(
          {
            limit,
            offset,
          },
          username,
          password,
          8_000
        );

        const page = Array.isArray(resultado?.data) ? resultado.data : [];
        if (page.length === 0) break;

        for (const pedidoCompleto of page) {
          const pedidoId = extractPedidoId(pedidoCompleto);
          if (!pedidoId || !idsPendentes.has(pedidoId)) continue;
          const dashboardItem = dashboardPorPedido.get(pedidoId) || {};
          const combinado = {
            ...dashboardItem,
            ...pedidoCompleto,
            _KANBAN_CONSULTA_CONSOLIDADA: true,
          };
          if (isPedidoDoKanbanNaData(combinado, dataReferencia)) {
            pedidosEnriquecidos.push(combinado);
          }
          idsPendentes.delete(pedidoId);
        }

        if (page.length < limit) break;
      }

      if (pedidosEnriquecidos.length > 0) {
        return pedidosEnriquecidos;
      }
    }
  } catch (error) {
    console.warn('[Kanban Pedidos] Dashboard consolidado indisponivel:', error);
    return [];
  }
}

async function fetchApuracoesFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataReferencia: string
): Promise<Map<number, ApuracaoExterna>> {
  return new Map<number, ApuracaoExterna>();
}

async function fetchNotasFiscaisFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataReferencia: string
): Promise<Map<number, Record<string, unknown>>> {
  return new Map<number, Record<string, unknown>>();
}

async function fetchNotasFiscaisCompletas(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string
): Promise<Map<number, Record<string, unknown>>> {
  const notaIds = new Set(
    pedidos.map(extractNotaFiscalId).filter((id): id is number => Boolean(id))
  );
  const pedidoIds = new Set(
    pedidos.map(extractPedidoId).filter((id) => id > 0)
  );
  if (notaIds.size === 0 && pedidoIds.size === 0) return new Map();

  const notasMap = new Map<number, Record<string, unknown>>();
  if (notaIds.size > 0) {
    const notasDiretas = await mapWithConcurrency(
      Array.from(notaIds),
      4,
      async (notaId) => {
        try {
          return await apiExternaService.buscarNotaFiscalCompleta(notaId, username, password);
        } catch {
          return null;
        }
      }
    );

    for (const nota of notasDiretas) {
      if (!nota) continue;
      const notaId = extractNotaFiscalId(nota);
      const pedidoId = extractPedidoIdFromNotaCompleta(nota);
      if (notaId && notaIds.has(notaId)) notasMap.set(notaId, nota);
      if (pedidoId && pedidoIds.has(pedidoId)) notasMap.set(-pedidoId, nota);
    }

    const encontrados = pedidos.filter((pedido) => Boolean(getNotaCompletaDoPedido(notasMap, pedido))).length;
    if (encontrados >= pedidos.length || notaIds.size >= pedidos.length) {
      return notasMap;
    }
  }

  const limit = 500;

  for (let offset = 0; offset < 1000; offset += limit) {
    const resultado = await apiExternaService.listarNotasFiscaisCompletas(
      { limit, offset },
      username,
      password
    );
    const completas = Array.isArray(resultado?.data) ? resultado.data : [];
    if (completas.length === 0) break;

    for (const nota of completas) {
      const notaId = extractNotaFiscalId(nota);
      const pedidoId = extractPedidoIdFromNotaCompleta(nota);
      if (notaId && notaIds.has(notaId)) notasMap.set(notaId, nota);
      if (pedidoId && pedidoIds.has(pedidoId)) notasMap.set(-pedidoId, nota);
    }

    const encontrados = pedidos.filter((pedido) => Boolean(getNotaCompletaDoPedido(notasMap, pedido))).length;
    if (encontrados >= pedidos.length) break;
    if (completas.length < limit) break;
    if (typeof resultado?.total === 'number' && resultado.total > 0 && offset + completas.length >= resultado.total) break;
  }

  return notasMap;
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
  return new Map();
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

    // Fluxo exclusivo do Kanban: /api/v1/pedidos seleciona os pedidos de
    // entrega; /api/v1/notas-fiscais/completas apenas complementa NF e NF-e.
    const pedidosBase = (await fetchPedidosDoDia(dataReferencia, username, password)).filter((pedido) => {
      if (pedido._KANBAN_CONSULTA_CONSOLIDADA === true) return true;
      return isPedidoFechadoERecebidoNoCaixa(pedido);
    });
    const notasFiscaisCompletasMap = await fetchNotasFiscaisCompletas(
      pedidosBase,
      username,
      password
    );
    const localNotasPorPedidoMap = await fetchLocalNotasPorPedidoSelecionado(dataReferencia);

    const pedidosComNotasLocaisPorPedido = pedidosBase.map((pedido) =>
      enrichPedidoWithNotaFiscalCompleta(
        pedido,
        getNotaCompletaDoPedido(notasFiscaisCompletasMap, pedido)
      )
    ).map((pedido) => enrichPedidoWithLocalNotaPorPedido(
      pedido,
      localNotasPorPedidoMap.get(extractPedidoId(pedido)) || null
    ));

    const numeroNotaCandidates = new Set<string>();
    const codigoCandidates = new Set<string>();

    for (const pedido of pedidosComNotasLocaisPorPedido) {
      const numeroNota =
        pickString(
          pedido.NUMERO_NOTA,
          pedido.NUMERO_NOTA_FISCAL,
          extractNumeroNotaFromExternalNota(
            getNotaCompletaDoPedido(notasFiscaisCompletasMap, pedido)
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

    const confirmacaoRows = await prisma.configuracaoSistema.findMany({
      where: { chave: { startsWith: CONFIRMATION_PREFIX } },
      select: { valor: true },
    });
    const confirmacoes = new Map<string, DeliveryConfirmationInfo>();
    for (const row of confirmacaoRows) {
      const item = parseDeliveryConfirmation(row.valor);
      if (!item?.entregue) continue;
      confirmacoes.set(buildConfirmationKey(item.controleId, item.numeroNota), item);
    }

    const sswEnabled = Boolean(
      (process.env.SSW_ACCERT_DOMAIN &&
        process.env.SSW_ACCERT_USERNAME &&
        process.env.SSW_ACCERT_CNPJ_EDI &&
        process.env.SSW_ACCERT_PASSWORD) ||
        hasPortalCredentials()
    );

    const chaveInfoMap = new Map<
      string,
      { numeroNota: string | null; transportadora: string | null }
    >();

    for (const pedido of pedidosComNotasLocaisPorPedido) {
      const numeroNota =
        pickString(
          pedido.NUMERO_NOTA,
          pedido.NUMERO_NOTA_FISCAL,
          extractNumeroNotaFromExternalNota(
            getNotaCompletaDoPedido(notasFiscaisCompletasMap, pedido)
          )
        ) || null;
      const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
      const notaLocal =
        (numeroNota ? notaPorNumero.get(normalizeNumeroNota(numeroNota)) : undefined) ||
        notaPorCodigo.get(chave);
      const pedidoId = extractPedidoId(pedido);
      const notaLocalPorPedido = localNotasPorPedidoMap.get(pedidoId);
      const controleIdResolvido =
        notaLocal?.controleId || notaLocalPorPedido?.controleId || null;

      if (!controleIdResolvido || chave.length !== 44 || !sswEnabled) {
        continue;
      }

      chaveInfoMap.set(chave, {
        numeroNota,
        transportadora:
          notaLocal?.controle?.transportadora || notaLocalPorPedido?.controleTransportadora || null,
      });
    }

    const trackingEntries: Array<readonly [string, TrackingInfo]> = await mapWithConcurrency(
      Array.from(chaveInfoMap.entries()),
      6,
      async ([chave, info]) => {
        try {
          const tracking = await fetchMergedTracking({
            chave,
            numeroNota: info.numeroNota,
            transportadora: info.transportadora,
          });
          return [chave, tracking] as const;
        } catch (error) {
          return [
            chave,
            {
              found: false,
              delivered: false,
              status: null,
              message: error instanceof Error ? error.message : 'Erro ao consultar SSW',
              deliveredAt: null,
              receiverName: null,
              photoUrl: null,
              occurrences: [],
            } satisfies TrackingInfo,
          ] as const;
        }
      }
    );
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
            getNotaCompletaDoPedido(notasFiscaisCompletasMap, pedido)
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
      const confirmacaoEntrega =
        controleIdResolvido && numeroNota
          ? confirmacoes.get(buildConfirmationKey(controleIdResolvido, numeroNota))
          : null;

      const tracking = identificacaoNfe ? trackingMap.get(identificacaoNfe) : undefined;
      const separacaoStatus = deriveSeparacaoStatus(pedido);
      const separacaoStatusLabel = getSeparacaoStatusLabel(separacaoStatus);

      let status: KanbanStatus = 'EM_PREPARACAO';
      let observacaoStatus: string | null = null;

      if (separacaoStatus === 'G' || controleIdResolvido) {
        status = 'ENVIADO_TRANSPORTADORA';
        observacaoStatus =
          controleIdResolvido
            ? 'Nota vinculada a um controle de carga'
            : 'Pedido conferido e pronto para seguir para embarque';
      } else if (separacaoStatus === 'E') {
        observacaoStatus = 'Pedido separado aguardando conferencia';
      } else if (separacaoStatus === 'S') {
        observacaoStatus = 'Pedido em separacao';
      } else if (separacaoStatus === 'A') {
        observacaoStatus = 'Pedido novo aguardando separacao';
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

      if (confirmacaoEntrega?.entregue) {
        status = 'PEDIDO_ENTREGUE';
        observacaoStatus =
          confirmacaoEntrega.observacao ||
          'Entrega confirmada manualmente no Baixar Entregas';
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
          pedido.PEDIDO_DATA_FECHAMENTO,
          pedido.PEDIDO_DATA_CADASTRO,
          pedido.DATA_EMISSAO
        ),
        dataEntrega: pickString(pedido.DATA_ENTREGA, pedido.DATA_HORA_ENTREGA),
        tipoEntrega: pickString(pedido.TIPO_ENTREGA),
        separacaoStatus,
        separacaoStatusLabel,
        numeroNota,
        identificacaoNfe,
        controleId: controleIdResolvido,
        controleDataCriacao: controleDataCriacaoResolvida?.toISOString() || null,
        controleTransportadora: controleTransportadoraResolvida || null,
        sswStatus: tracking?.status || (confirmacaoEntrega?.entregue ? 'ENTREGA_CONFIRMADA' : null),
        sswMensagem:
          tracking?.message ||
          (confirmacaoEntrega?.entregue
            ? `Baixa confirmada${confirmacaoEntrega.confirmadoPor ? ` por ${confirmacaoEntrega.confirmadoPor}` : ''}`
            : null),
        trackingDeliveredAt: tracking?.deliveredAt || confirmacaoEntrega?.dataConfirmacao || null,
        trackingReceiverName: tracking?.receiverName || null,
        trackingPhotoUrl: tracking?.photoUrl || null,
        trackingOccurrences: (tracking?.occurrences || []).map((occurrence) => ({
          dataHora: occurrence.dataHoraEfetiva || occurrence.dataHora,
          ocorrencia: occurrence.ocorrencia || occurrence.ocorrenciaSsw,
          descricao: occurrence.descricao || occurrence.detalhe,
          cidade: occurrence.cidade,
          dominio: occurrence.dominio,
        })),
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
