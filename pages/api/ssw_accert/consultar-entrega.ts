import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService, type ApuracaoExterna } from '@/services/api-externa';
import { consultarNotaFiscal, trackingDanfe } from '@/services/sswClient';

const DELIVERY_STATUSES = [
  'EM_PREPARACAO',
  'ENVIADO_TRANSPORTADORA',
  'EM_ROTA_ENTREGA',
  'PEDIDO_ENTREGUE',
] as const;

type DeliveryStatus = typeof DELIVERY_STATUSES[number];

type DeliveryTrackingInfo = {
  found: boolean;
  delivered: boolean;
  status: string | null;
  message: string | null;
};

type DeliveryItem = {
  id: string;
  pedidoId: number;
  clienteId: number;
  clienteNome: string;
  cnpjCpf: string | null;
  vendedorNome: string;
  valor: number;
  dataHoraCadastro: string | null;
  numeroNota: string | null;
  identificacaoNfe: string | null;
  controleId: string | null;
  controleDataCriacao: string | null;
  controleTransportadora: string | null;
  status: DeliveryStatus;
  statusLabel: string;
  sswStatus: string | null;
  sswMensagem: string | null;
  observacaoStatus: string | null;
};

function addDays(dateRef: string, days: number): string {
  const date = new Date(`${dateRef}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateInSaoPaulo(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(date);
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
  if (!digits) return String(value || '').trim().toLowerCase();
  return digits.replace(/^0+/, '') || '0';
}

function normalizeFreeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractPedidoId(pedido: Record<string, unknown>): number {
  return (
    pickNumber(
      pedido.ORCAMENTO_ID,
      pedido.PEDIDO_ID,
      pedido.ID,
      pedido.ORCAMENTO,
      pedido.orcamento_id,
      pedido.pedido_id,
      pedido.id,
      pedido.numero_pedido,
      pedido.NUMERO_PEDIDO
    ) || 0
  );
}

function extractPedidoCnpj(pedido: Record<string, unknown>): string | null {
  const cliente = (pedido.CLIENTE || pedido.cliente || null) as Record<string, unknown> | null;
  const raw =
    pickString(
      pedido.CNPJ_CPF,
      pedido.CNPJCPF,
      pedido.CNPJ_CPF_DESTINATARIO,
      pedido.CPF_CNPJ,
      pedido.CNPJ,
      pedido.CPF,
      cliente?.CNPJ,
      cliente?.CPF,
      cliente?.CNPJ_CPF
    ) || null;

  const digits = onlyDigits(raw);
  return digits || raw;
}

function matchesPedidoQuery(
  pedido: Record<string, unknown>,
  numeroPedido: string
): boolean {
  const normalizedQuery = onlyDigits(numeroPedido) || numeroPedido.trim();
  if (!normalizedQuery) return false;

  const candidates = [
    pickString(pedido.NUMERO_PEDIDO),
    pickString(pedido.numero_pedido),
    pickString(pedido.ORCAMENTO_ID),
    pickString(pedido.orcamento_id),
    pickString(pedido.ORCAMENTO),
    pickString(pedido.PEDIDO_ID),
    pickString(pedido.pedido_id),
    pickString(pedido.ID),
    pickString(pedido.id),
  ].filter((value): value is string => Boolean(value));

  return candidates.some((candidate) => {
    const normalizedCandidate = onlyDigits(candidate) || candidate.trim();
    return normalizedCandidate === normalizedQuery;
  });
}

function getStatusLabel(status: DeliveryStatus): string {
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

function parseTrackingInfo(data: Record<string, unknown>): DeliveryTrackingInfo {
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

async function fetchPedidosPorPedido(
  numeroPedido: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const candidatos = new Map<number, Record<string, unknown>>();

  const pedidosDiretos = await apiExternaService.buscarPedidoPorNumero(numeroPedido, username, password);
  if (Array.isArray(pedidosDiretos)) {
    for (const pedido of pedidosDiretos as Array<Record<string, unknown>>) {
      const pedidoId = extractPedidoId(pedido);
      candidatos.set(pedidoId || candidatos.size + 1, pedido);
    }
  }

  const limit = 100;
  const dateFrom = addDays(getDateInSaoPaulo(), -480);
  const dateTo = addDays(getDateInSaoPaulo(), 300);
  let totalDisponivel = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < totalDisponivel; offset += limit) {
    const resultadoBusca = await apiExternaService.listarPedidos(
      {
        data_inicio: dateFrom,
        data_fim: dateTo,
        search: numeroPedido,
        limit,
        offset,
      },
      username,
      password
    );

    const page = Array.isArray(resultadoBusca?.data)
      ? (resultadoBusca.data as Array<Record<string, unknown>>)
      : [];
    totalDisponivel =
      typeof resultadoBusca?.total === 'number' && resultadoBusca.total > 0
        ? resultadoBusca.total
        : offset + page.length;

    for (const pedido of page) {
      const pedidoId = extractPedidoId(pedido);
      candidatos.set(pedidoId || candidatos.size + 1, pedido);
    }

    if (page.some((pedido) => matchesPedidoQuery(pedido, numeroPedido))) {
      break;
    }

    if (page.length < limit) {
      break;
    }

    if (offset >= 1000 && candidatos.size === 0) {
      break;
    }
  }

  return Array.from(candidatos.values()).filter((pedido) => matchesPedidoQuery(pedido, numeroPedido));
}

async function fetchPedidosPorCnpj(
  cnpj: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const pedidos: Array<Record<string, unknown>> = [];
  const seen = new Set<number>();
  const dateTo = getDateInSaoPaulo();
  const dateFrom = addDays(dateTo, -60);
  const limit = 100;

  for (let offset = 0; offset < 1000; offset += limit) {
    const resultado = await apiExternaService.listarPedidos(
      {
        data_inicio: dateFrom,
        data_fim: dateTo,
        tipo_data: 'recebimento',
        tipo_entrega: 'EPG',
        search: cnpj,
        limit,
        offset,
      },
      username,
      password
    );

    const page = Array.isArray(resultado?.data)
      ? resultado.data.filter((pedido) => extractPedidoCnpj(pedido as Record<string, unknown>) === cnpj)
      : [];

    for (const item of page) {
      const pedidoId = extractPedidoId(item as Record<string, unknown>);
      if (!pedidoId || seen.has(pedidoId)) continue;
      seen.add(pedidoId);
      pedidos.push(item as Record<string, unknown>);
    }

    if (!resultado?.data?.length || (resultado.data?.length ?? 0) < limit) break;
  }

  return pedidos;
}

function getSearchWindow(pedidos: Array<Record<string, unknown>>): { dataInicio: string; dataFim: string } {
  const dates = pedidos
    .map((pedido) =>
      parseDate(
        pickString(
          pedido.DATA_HORA_RECEBIMENTO,
          pedido.DATA_RECEBIMENTO,
          pedido.DATA_HORA_CADASTRO,
          pedido.DATA_CADASTRO
        )
      )
    )
    .filter((value): value is Date => Boolean(value));

  if (dates.length === 0) {
    const dataFim = getDateInSaoPaulo();
    return {
      dataInicio: addDays(dataFim, -60),
      dataFim,
    };
  }

  const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));

  return {
    dataInicio: addDays(minDate.toISOString().slice(0, 10), -7),
    dataFim: addDays(maxDate.toISOString().slice(0, 10), 10),
  };
}

async function fetchApuracoesFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataInicio: string,
  dataFim: string
): Promise<Map<number, ApuracaoExterna>> {
  const missingIds = pedidos
    .filter((pedido) => {
      const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
      const chave = pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE);
      return !numeroNota || onlyDigits(chave).length !== 44;
    })
    .map(extractPedidoId)
    .filter((id) => id > 0);

  if (missingIds.length === 0) return new Map<number, ApuracaoExterna>();

  const missingSet = new Set(missingIds);
  const apuracaoMap = new Map<number, ApuracaoExterna>();
  const batchLimit = 200;

  for (let offset = 0; offset < 5000; offset += batchLimit) {
    const resultado = await apiExternaService.listarApuracoes(
      { data_inicio: dataInicio, data_fim: dataFim, limit: batchLimit, offset },
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

    if (itens.length < batchLimit || apuracaoMap.size >= missingSet.size) break;
  }

  return apuracaoMap;
}

async function fetchNotasFiscaisFallback(
  pedidos: Array<Record<string, unknown>>,
  username: string,
  password: string,
  dataInicio: string,
  dataFim: string
): Promise<Array<Record<string, unknown>>> {
  const pendingIds = pedidos
    .filter((pedido) => {
      const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
      const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
      return !numeroNota || chave.length !== 44;
    })
    .map(extractPedidoId)
    .filter((id) => id > 0);

  if (pendingIds.length === 0) return [];

  const notas = await apiExternaService.listarNotasFiscais(
    { dataInicio, dataFim },
    username,
    password
  );

  return notas as Array<Record<string, unknown>>;
}

function buildNotaFiscalMap(
  notas: Array<Record<string, unknown>>,
  pedidos: Array<Record<string, unknown>>
): Map<number, Record<string, unknown>> {
  const pendingIds = new Set(
    pedidos
      .filter((pedido) => {
        const numeroNota = pickString(pedido.NUMERO_NOTA, pedido.NUMERO_NOTA_FISCAL);
        const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
        return !numeroNota || chave.length !== 44;
      })
      .map(extractPedidoId)
      .filter((id) => id > 0)
  );

  const notaMap = new Map<number, Record<string, unknown>>();

  for (const nota of notas) {
    const pedidoId =
      pickNumber(
        nota.ORCAMENTO_BASE_ID,
        nota.ORCAMENTO_ID,
        nota.PEDIDO_ID
      ) || 0;

    if (pedidoId > 0 && pendingIds.has(pedidoId) && !notaMap.has(pedidoId)) {
      notaMap.set(pedidoId, nota);
    }
  }

  return notaMap;
}

function buildPedidoIdFromNotasExternas(
  notas: Array<Record<string, unknown>>
): {
  pedidoIdPorNumeroNota: Map<string, number>;
  pedidoIdPorCodigo: Map<string, number>;
} {
  const pedidoIdPorNumeroNota = new Map<string, number>();
  const pedidoIdPorCodigo = new Map<string, number>();

  for (const nota of notas) {
    const pedidoId =
      pickNumber(
        nota.ORCAMENTO_BASE_ID,
        nota.ORCAMENTO_ID,
        nota.PEDIDO_ID
      ) || 0;

    if (!pedidoId) continue;

    const numeroNota = normalizeNumeroNota(extractNumeroNotaFromExternalNota(nota));
    if (numeroNota && !pedidoIdPorNumeroNota.has(numeroNota)) {
      pedidoIdPorNumeroNota.set(numeroNota, pedidoId);
    }

    const codigo = onlyDigits(
      pickString(
        nota.IDENTIFICACAO_NFE,
        nota.CHAVE_NFE,
        nota.codigo,
        nota.CODIGO
      )
    );
    if (codigo.length === 44 && !pedidoIdPorCodigo.has(codigo)) {
      pedidoIdPorCodigo.set(codigo, pedidoId);
    }
  }

  return { pedidoIdPorNumeroNota, pedidoIdPorCodigo };
}

async function fetchLocalNotasPorPedidoIds(
  dataInicio: string,
  dataFim: string,
  pedidoIds: number[],
  notasExternas: Array<Record<string, unknown>>
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
  const targetIds = Array.from(new Set(pedidoIds.filter((id) => id > 0)));
  if (targetIds.length === 0) {
    return new Map();
  }

  const { pedidoIdPorNumeroNota, pedidoIdPorCodigo } = buildPedidoIdFromNotasExternas(notasExternas);

  const notasLocais = await prisma.notaFiscal.findMany({
    where: {
      dataCriacao: {
        gte: new Date(`${dataInicio}T00:00:00-03:00`),
        lte: new Date(`${dataFim}T23:59:59-03:00`),
      },
      controleId: {
        not: null,
      },
    },
    orderBy: {
      dataCriacao: 'desc',
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

  const targetSet = new Set(targetIds);
  const map = new Map<
    number,
    {
      numeroNota: string;
      codigo: string;
      controleId: string | null;
      controleDataCriacao: Date | null;
      controleTransportadora: string | null;
    }
  >();

  for (const nota of notasLocais) {
    const pedidoId =
      pedidoIdPorCodigo.get(onlyDigits(nota.codigo)) ||
      pedidoIdPorNumeroNota.get(normalizeNumeroNota(nota.numeroNota)) ||
      0;

    if (!pedidoId || !targetSet.has(pedidoId) || map.has(pedidoId)) continue;

    map.set(pedidoId, {
      numeroNota: nota.numeroNota,
      codigo: nota.codigo,
      controleId: nota.controleId,
      controleDataCriacao: nota.controle?.dataCriacao || null,
      controleTransportadora: nota.controle?.transportadora || null,
    });
  }

  return map;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ data: DeliveryItem[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  try {
    const pedidoQuery = typeof req.query.pedido === 'string' ? req.query.pedido.trim() : '';
    const cnpjQuery = onlyDigits(typeof req.query.cnpj === 'string' ? req.query.cnpj : '');

    if (!pedidoQuery && !cnpjQuery) {
      return res.status(400).json({ error: 'Informe um numero de pedido ou CNPJ.' });
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({ error: 'Credenciais da API externa nao configuradas.' });
    }

    const pedidosBase = pedidoQuery
      ? await fetchPedidosPorPedido(pedidoQuery, username, password)
      : await fetchPedidosPorCnpj(cnpjQuery, username, password);

    if (pedidosBase.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const { dataInicio, dataFim } = getSearchWindow(pedidosBase);
    const apuracaoMap = await fetchApuracoesFallback(pedidosBase, username, password, dataInicio, dataFim);
    const pedidosComApuracao = pedidosBase.map((pedido) =>
      enrichPedidoWithApuracao(pedido, apuracaoMap.get(extractPedidoId(pedido)))
    );

    const notasExternas = await fetchNotasFiscaisFallback(
      pedidosComApuracao,
      username,
      password,
      dataInicio,
      dataFim
    );
    const notaFiscalMap = buildNotaFiscalMap(notasExternas, pedidosComApuracao);
    const pedidosComNotas = pedidosComApuracao.map((pedido) =>
      enrichPedidoWithNotaFiscal(pedido, notaFiscalMap.get(extractPedidoId(pedido)))
    );

    const keysSemNumeroNota = Array.from(
      new Set(
        pedidosComNotas
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
        return [chave, nota as Record<string, unknown>] as const;
      } catch {
        return [chave, null] as const;
      }
    });
    const notaExternaMap = new Map<string, Record<string, unknown> | null>(notaExternaEntries);

    const pedidosResolvidos = pedidosComNotas.map((pedido) =>
      enrichPedidoWithExternalNota(
        pedido,
        notaExternaMap.get(onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE))) || null
      )
    );

    const numeroNotaCandidates = new Set<string>();
    const codigoCandidates = new Set<string>();

    for (const pedido of pedidosResolvidos) {
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
      if (chave.length === 44) codigoCandidates.add(chave);
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

    const pedidosPendentesPorPedido = pedidosResolvidos.filter((pedido) => {
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

      return !notaLocal?.controleId;
    });

    const localNotasPorPedidoMap = await fetchLocalNotasPorPedidoIds(
      dataInicio,
      dataFim,
      pedidosPendentesPorPedido.map(extractPedidoId),
      notasExternas
    );

    const pedidosComNotasLocaisPorPedido = pedidosResolvidos.map((pedido) =>
      enrichPedidoWithLocalNotaPorPedido(
        pedido,
        localNotasPorPedidoMap.get(extractPedidoId(pedido)) || null
      )
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
            } satisfies DeliveryTrackingInfo,
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
          } satisfies DeliveryTrackingInfo,
        ] as const;
      }
    });
    const trackingMap = new Map<string, DeliveryTrackingInfo>(trackingEntries);

    const items = pedidosComNotasLocaisPorPedido.map((pedido) => {
      const pedidoId = extractPedidoId(pedido);
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

      let status: DeliveryStatus = 'EM_PREPARACAO';
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

      return {
        id: `pedido-${pedidoId}`,
        pedidoId,
        clienteId: pickNumber(pedido.CADASTRO_ID) || 0,
        clienteNome:
          pickString(pedido.CLIENTE_NOME, pedido.NOME_RAZAO_SOCIAL, pedido.NOME_FANTASIA, pedido.NOME) ||
          'Cliente nao identificado',
        cnpjCpf: extractPedidoCnpj(pedido),
        vendedorNome:
          pickString(pedido.VENDEDOR_NOME, pedido.NOME_REPRESENTANTE, pedido.NOME) || 'Sem representante',
        valor:
          pickNumber(
            pedido.VALOR_TOTAL,
            pedido.VALOR_PEDIDO,
            pedido.VALOR_PRODUTOS,
            pedido.VALOR_DUPLICATA
          ) || 0,
        dataHoraCadastro: pickString(pedido.DATA_HORA_CADASTRO, pedido.DATA_HORA_RECEBIMENTO),
        numeroNota,
        identificacaoNfe,
        controleId: controleIdResolvido,
        controleDataCriacao: controleDataCriacaoResolvida?.toISOString() || null,
        controleTransportadora: controleTransportadoraResolvida || null,
        status,
        statusLabel: getStatusLabel(status),
        sswStatus: tracking?.status || null,
        sswMensagem: tracking?.message || null,
        observacaoStatus,
      } satisfies DeliveryItem;
    });

    items.sort((a, b) => {
      const dateA = new Date(a.dataHoraCadastro || 0).getTime();
      const dateB = new Date(b.dataHoraCadastro || 0).getTime();
      return dateB - dateA;
    });

    return res.status(200).json({ data: items });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao consultar entrega',
    });
  }
}
