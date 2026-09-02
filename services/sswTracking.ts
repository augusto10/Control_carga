import { trackingDanfe } from './sswClient';
import { trackingPortalByNotaFiscal } from './sswPortalClient';

/**
 * Ocorrencia normalizada de rastreio (portal SSW ou tracking DANFE).
 * Usada no Rastrear Pedidos para exibir TODAS as ocorrencias da entrega.
 */
export type SswTrackingOccurrence = {
  dataHora: string | null;
  dataHoraEfetiva: string | null;
  cidade: string | null;
  filial: string | null;
  dominio: string | null;
  tipo: string | null;
  ocorrencia: string | null;
  descricao: string | null;
  ocorrenciaSsw: string | null;
  usuario: string | null;
  detalhe: string | null;
  documentos: string | null;
  conferentes: string | null;
  imagem: string | null;
  imagemUrl: string | null;
};

export type SswTrackingResult = {
  found: boolean;
  delivered: boolean;
  status: string | null;
  message: string | null;
  deliveredAt: string | null;
  receiverName: string | null;
  photoUrl: string | null;
  occurrences: SswTrackingOccurrence[];
  source: 'trackingdanfe' | 'ssw_portal' | 'trackingdanfe+ssw_portal' | null;
};

type PortalTrackingPayload = {
  success?: boolean;
  message?: string;
  documento?: {
    header?: unknown;
    tracking?: Array<Record<string, unknown>>;
  };
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

function onlyDigits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeFreeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function hasPortalCredentials(): boolean {
  return Boolean(
    (process.env.SSW_ACCERT_DOMAIN &&
      process.env.SSW_ACCERT_USERNAME &&
      process.env.SSW_ACCERT_PASSWORD) ||
      (process.env.SSW_EXPRESSO_GOIAS_DOMAIN &&
        process.env.SSW_EXPRESSO_GOIAS_USERNAME &&
        process.env.SSW_EXPRESSO_GOIAS_PASSWORD) ||
      (process.env.SSW_ZANUELLO_DOMAIN &&
        process.env.SSW_ZANUELLO_USERNAME &&
        process.env.SSW_ZANUELLO_PASSWORD)
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

function parseTrackingEventDateMs(event: Record<string, unknown>): number {
  const raw =
    pickString(event.data_hora_efetiva, event.data_hora, event.DATA_HORA_EFETIVA, event.DATA_HORA) ||
    null;

  if (!raw) return -1;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getTime();
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

function extractTrackingEventPhotoUrl(event: Record<string, unknown> | null | undefined): string | null {
  if (!event) return null;
  return (
    pickString(
      event.imagem_url,
      event.IMAGEM_URL,
      event.foto,
      event.FOTO,
      event.comprovante,
      event.COMPROVANTE,
      event.url_foto,
      event.URL_FOTO,
      event.link_foto,
      event.LINK_FOTO,
      event.url_imagem,
      event.URL_IMAGEM,
      event.imagem,
      event.IMAGEM,
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

function normalizeOccurrence(event: Record<string, unknown>): SswTrackingOccurrence {
  const raw = pickString(
    event.data_hora_efetiva,
    event.DATA_HORA_EFETIVA,
    event.data_hora,
    event.DATA_HORA,
    event.data_entrega,
    event.DATA_ENTREGA
  );

  return {
    dataHora: raw,
    dataHoraEfetiva: pickString(
      event.data_hora_efetiva,
      event.DATA_HORA_EFETIVA,
      event.data_hora,
      event.DATA_HORA
    ),
    cidade: pickString(event.cidade, event.CIDADE),
    filial: pickString(event.filial, event.FILIAL),
    dominio: pickString(event.dominio, event.DOMINIO, event.transportadora, event.TRANSPORTADORA),
    tipo: pickString(event.tipo, event.TIPO),
    ocorrencia: pickString(event.ocorrencia, event.OCORRENCIA),
    descricao: pickString(
      event.descricao,
      event.DESCRICAO,
      event.mensagem,
      event.MENSAGEM,
      event.observacao,
      event.OBSERVACAO,
      event.motivo,
      event.MOTIVO,
      event.complemento,
      event.COMPLEMENTO
    ),
    ocorrenciaSsw: pickString(event.ocorrencia_ssw, event.OCORRENCIA_SSW),
    usuario: pickString(event.usuario, event.USUARIO),
    detalhe: pickString(event.detalhe, event.DETALHE),
    documentos: pickString(event.documentos, event.DOCUMENTOS),
    conferentes: pickString(event.conferentes, event.CONFERENTES),
    imagem: pickString(event.imagem, event.IMAGEM),
    imagemUrl: pickString(
      event.imagem_url,
      event.IMAGEM_URL,
      event.url_imagem,
      event.URL_IMAGEM,
      event.foto,
      event.FOTO,
      event.link_foto,
      event.LINK_FOTO,
      event.pod,
      event.POD,
      event.comprovante,
      event.COMPROVANTE
    ),
  };
}

function getTrackingEventList(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  const documento = payload.documento as Record<string, unknown> | undefined;
  const documentoTracking = documento?.tracking;

  if (Array.isArray(documentoTracking)) {
    const portalEvents = documentoTracking.filter(
      (event): event is Record<string, unknown> => !!event && typeof event === 'object'
    );
    if (portalEvents.length > 0) return portalEvents;
  }

  return extractTrackingEvents(payload);
}


function parseTracking(
  payload: Record<string, unknown>,
  source: SswTrackingResult['source']
): SswTrackingResult {
  const events = getTrackingEventList(payload).sort(
    (a, b) => parseTrackingEventDateMs(a) - parseTrackingEventDateMs(b)
  );
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  const status =
    pickString(
      payload.status,
      payload.STATUS,
      payload.situacao,
      payload.SITUACAO,
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
    extractTrackingText(payload) ||
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
    occurrences: events.map(normalizeOccurrence),
    source,
  };
}


/**
 * Consulta o rastreio usando o mesmo codigo do "Acompanhar Entregas" (solucoes):
 * portal SSW (Situacao do CTRC) + fallback/merge tracking DANFE.
 * Retorna todas as ocorrencias do rastreio sem as restricoes usadas no
 * acompanhamento-entregas (que limita o tracking as 20 notas mais recentes).
 */
export async function fetchMergedTracking(input: {
  chave: string;
  numeroNota?: string | null;
  transportadora?: string | null;
}): Promise<SswTrackingResult> {
  const { chave, numeroNota, transportadora } = input;
  const canUsePortal = hasPortalCredentials() && Boolean(numeroNota);

  type DanfeOutcome =
    | { kind: 'ok'; data: Record<string, unknown> }
    | { kind: 'err'; error: unknown };
  type PortalOutcome =
    | { kind: 'ok'; data: PortalTrackingPayload }
    | { kind: 'err'; error: unknown };

  const danfePromise: Promise<DanfeOutcome> = trackingDanfe(chave).then(
    (data) => {
      if (data?.erro === true) {
        return {
          kind: 'err',
          error:
            pickString(data.mensagem, (data as Record<string, unknown>).MENSAGEM) ||
            'SSW retornou erro ao consultar o tracking',
        };
      }
      return { kind: 'ok', data: data as Record<string, unknown> };
    },
    (error: unknown) => ({ kind: 'err', error })
  );

  const portalPromise: Promise<PortalOutcome | null> =
    canUsePortal && numeroNota
      ? trackingPortalByNotaFiscal(numeroNota, transportadora).then(
          (data) => ({ kind: 'ok', data }),
          (error: unknown) => ({ kind: 'err', error })
        )
      : Promise.resolve(null);

  const [danfeOutcome, portalOutcome] = await Promise.all([danfePromise, portalPromise]);

  const danfePayload = danfeOutcome.kind === 'ok' ? danfeOutcome.data : null;
  const danfeError = danfeOutcome.kind === 'err' ? danfeOutcome.error : null;
  const portalPayload = portalOutcome?.kind === 'ok' ? portalOutcome.data : null;
  const portalError = portalOutcome?.kind === 'err' ? portalOutcome.error : null;

  const portalEvents = portalPayload?.documento?.tracking ?? [];

  let payload: Record<string, unknown> | null = null;
  let source: SswTrackingResult['source'] = null;

  if (portalEvents.length > 0) {
    const danfeDocumento = (danfePayload?.documento ?? {}) as Record<string, unknown>;
    payload = {
      ...(danfePayload ?? {}),
      documento: {
        ...danfeDocumento,
        tracking: portalEvents,
        source: 'trackingdanfe+ssw_portal',
      },
    };
    source = 'trackingdanfe+ssw_portal';
  } else if (danfePayload) {
    payload = danfePayload;
    source = 'trackingdanfe';
  }

  if (!payload) {
    const errorMessage =
      (danfeError instanceof Error ? danfeError.message : null) ||
      (portalError instanceof Error ? portalError.message : null) ||
      'Nao foi possivel consultar o rastreio';

    return {
      found: false,
      delivered: false,
      status: null,
      message: errorMessage,
      deliveredAt: null,
      receiverName: null,
      photoUrl: null,
      occurrences: [],
      source,
    };
  }

  return parseTracking(payload, source);
}

