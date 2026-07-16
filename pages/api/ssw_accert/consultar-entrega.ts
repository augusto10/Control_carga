import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { trackingDanfe } from '@/services/sswClient';

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
  deliveredAt: string | null;
  receiverName: string | null;
  photoUrl: string | null;
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
  dataHoraEntrega: string | null;
  recebedor: string | null;
  fotoEntregaUrl: string | null;
};

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

function extractPedidoId(pedido: Record<string, unknown>): number {
  return (
    pickNumber(
      pedido.ORCAMENTO_ID,
      pedido.ORCAMENTO_BASE_ID,
      pedido.PEDIDO_ID,
      pedido.ID,
      pedido.ORCAMENTO,
      pedido.orcamento_id,
      pedido.orcamento_base_id,
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

function extractVendedorLabel(pedido: Record<string, unknown>): string {
  const nome = pickString(
    pedido.VENDEDOR_NOME,
    pedido.NOME_VENDEDOR,
    pedido.NOME_REPRESENTANTE,
    pedido.REPRESENTANTE,
    pedido.VENDEDOR,
    pedido.NOME
  );

  if (nome) return nome;

  const codigo = pickString(
    pedido.VENDEDOR_ID,
    pedido.COD_VENDEDOR,
    pedido.CODIGO_VENDEDOR,
    pedido.REPRESENTANTE_ID
  );

  return codigo ? `Vendedor ${codigo}` : 'Sem representante';
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
    pickString(pedido.ORCAMENTO_BASE_ID),
    pickString(pedido.orcamento_base_id),
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

function extractTrackingEventPhotoUrl(event: Record<string, unknown> | null | undefined): string | null {
  if (!event) return null;
  return (
    pickString(
      event.foto,
      event.FOTO,
      event.imagem,
      event.IMAGEM,
      event.comprovante,
      event.COMPROVANTE,
      event.url_foto,
      event.URL_FOTO,
      event.link_foto,
      event.LINK_FOTO,
      event.url_imagem,
      event.URL_IMAGEM,
      event.pod,
      event.POD
    ) || null
  );
}

function extractTrackingEventReceiver(event: Record<string, unknown> | null | undefined): string | null {
  if (!event) return null;
  return (
    pickString(
      event.recebedor,
      event.RECEBEDOR,
      event.nome_recebedor,
      event.NOME_RECEBEDOR,
      event.recebido_por,
      event.RECEBIDO_POR,
      event.destinatario,
      event.DESTINATARIO,
      event.nome_destinatario,
      event.NOME_DESTINATARIO
    ) || null
  );
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

  const deliveredEvent = delivered
    ? [...events]
        .reverse()
        .find((event) =>
          normalizeFreeText(
            `${pickString(event.ocorrencia, event.OCORRENCIA, event.descricao, event.DESCRICAO) || ''}`
          ).match(/entregue|entrega realizada|mercadoria entregue|recebido pelo destinatario|baixado/)
        ) || latestEvent
    : null;

  const deliveredAt =
    pickString(
      deliveredEvent?.data_hora_efetiva,
      deliveredEvent?.DATA_HORA_EFETIVA,
      deliveredEvent?.data_hora,
      deliveredEvent?.DATA_HORA,
      deliveredEvent?.data_entrega,
      deliveredEvent?.DATA_ENTREGA
    ) || null;
  const receiverName = extractTrackingEventReceiver(deliveredEvent);
  const photoUrl = extractTrackingEventPhotoUrl(deliveredEvent);

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
    deliveredAt,
    receiverName,
    photoUrl,
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

async function fetchNotasFiscaisCompletasPorFiltro(
  matches: (item: Record<string, unknown>) => boolean,
  username: string,
  password: string,
  stopOnFirstMatch: boolean
): Promise<Array<Record<string, unknown>> | null> {
  const limit = 500;
  const resultados: Array<Record<string, unknown>> = [];
  const seen = new Set<number | string>();

  for (let offset = 0; offset < 2500; offset += limit) {
    const resultado = await apiExternaService.listarNotasFiscaisCompletas(
      { limit, offset },
      username,
      password
    );

    if (!resultado) return null;

    const page = Array.isArray(resultado.data) ? resultado.data : [];
    const encontrados = page.filter(matches);
    for (const item of encontrados) {
      const dedupeKey = extractNotaFiscalId(item) || `${extractPedidoId(item)}-${resultados.length}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      resultados.push(item);
    }

    if (stopOnFirstMatch && resultados.length > 0) break;
    if (page.length < limit) break;
    if (typeof resultado.total === 'number' && resultado.total > 0 && offset + page.length >= resultado.total) break;
  }

  return resultados;
}

async function fetchPedidosPorPedido(
  numeroPedido: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const pedidosConsolidados = await fetchNotasFiscaisCompletasPorFiltro(
    (item) => matchesPedidoQuery(item, numeroPedido),
    username,
    password,
    true
  );

  if (pedidosConsolidados?.length) return pedidosConsolidados;
  return [];
}

async function fetchPedidosPorCnpj(
  cnpj: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const pedidosConsolidados = await fetchNotasFiscaisCompletasPorFiltro(
    (item) => extractPedidoCnpj(item) === cnpj,
    username,
    password,
    false
  );

  if (pedidosConsolidados?.length) return pedidosConsolidados;
  return [];
}

async function fetchNotasFiscaisCompletas(
  pedidos: Array<Record<string, unknown>>,
  _username: string,
  _password: string
): Promise<Map<number, Record<string, unknown>>> {
  const notasJaCompletas = new Map<number, Record<string, unknown>>();

  for (const pedido of pedidos) {
    const notaFiscalId = extractNotaFiscalId(pedido);
    if (notaFiscalId) notasJaCompletas.set(notaFiscalId, pedido);
  }

  return notasJaCompletas;
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

    const pedidosComNotas = pedidosBase;
    const notasFiscaisCompletasMap = await fetchNotasFiscaisCompletas(
      pedidosComNotas,
      username,
      password
    );

    const pedidosResolvidos = pedidosComNotas.map((pedido) =>
      enrichPedidoWithNotaFiscalCompleta(
        pedido,
        notasFiscaisCompletasMap.get(extractNotaFiscalId(pedido) || 0)
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
            notasFiscaisCompletasMap.get(extractNotaFiscalId(pedido) || 0) || null
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

    const pedidosComNotasLocaisPorPedido = pedidosResolvidos;

    const chavesComControle = Array.from(
      new Set(
        pedidosComNotasLocaisPorPedido
          .map((pedido) => {
            const numeroNota =
              pickString(
                pedido.NUMERO_NOTA,
                pedido.NUMERO_NOTA_FISCAL,
                extractNumeroNotaFromExternalNota(
                  notasFiscaisCompletasMap.get(extractNotaFiscalId(pedido) || 0) || null
                )
              ) || null;
            const chave = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
            const notaLocal =
              (numeroNota ? notaPorNumero.get(normalizeNumeroNota(numeroNota)) : undefined) ||
              notaPorCodigo.get(chave);
            const controleIdResolvido = notaLocal?.controleId || null;

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
            deliveredAt: null,
            receiverName: null,
            photoUrl: null,
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
            deliveredAt: null,
            receiverName: null,
            photoUrl: null,
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
            notasFiscaisCompletasMap.get(extractNotaFiscalId(pedido) || 0) || null
          )
        ) || null;

      const identificacaoNfe = (() => {
        const raw = onlyDigits(pickString(pedido.IDENTIFICACAO_NFE, pedido.CHAVE_NFE));
        return raw.length === 44 ? raw : null;
      })();

      const notaLocal =
        (numeroNota ? notaPorNumero.get(normalizeNumeroNota(numeroNota)) : undefined) ||
        (identificacaoNfe ? notaPorCodigo.get(identificacaoNfe) : undefined);
      const controleIdResolvido = notaLocal?.controleId || null;
      const controleDataCriacaoResolvida = notaLocal?.controle?.dataCriacao || null;
      const controleTransportadoraResolvida = notaLocal?.controle?.transportadora || null;

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
        vendedorNome: extractVendedorLabel(pedido),
        valor:
          pickNumber(
            pedido.VALOR_TOTAL,
            pedido.VALOR_PEDIDO,
            pedido.VALOR_TOTAL_NOTA,
            pedido.VALOR_PRODUTOS,
            pedido.VALOR_DUPLICATA
          ) || 0,
        dataHoraCadastro: pickString(
          pedido.DATA_HORA_RECEBIMENTO,
          pedido.DATA_RECEBIMENTO,
          pedido.PEDIDO_DATA_FECHAMENTO,
          pedido.DATA_HORA_CADASTRO,
          pedido.PEDIDO_DATA_CADASTRO,
          pedido.DATA_CADASTRO,
          pedido.DATA_HORA_EMISSAO
        ),
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
        dataHoraEntrega: tracking?.deliveredAt || null,
        recebedor: tracking?.receiverName || null,
        fotoEntregaUrl: tracking?.photoUrl || null,
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
