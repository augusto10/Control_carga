import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { fetchMergedTracking, type SswTrackingOccurrence } from '@/services/sswTracking';

type DeliveryConfirmationInfo = {
  controleId: string;
  numeroNota: string;
  entregue: boolean;
};

type PendenciaEntregaItem = {
  id: string;
  pedidoId: number;
  clienteId: number | null;
  cliente: string;
  vendedor: string;
  valor: number;
  tipoEntrega: string | null;
  dataHoraRecebimento: string | null;
  numeroNota: string | null;
  identificacaoNfe: string;
  transportadora: string | null;
  controleId: string | null;
  statusAtual: string;
  dataHoraStatus: string | null;
  sswStatus: string | null;
  sswMensagem: string | null;
  ocorrencias: SswTrackingOccurrence[];
};

type ResponseData =
  | {
      periodo: { dataInicio: string; dataFim: string };
      totais: { encontrados: number };
      data: PendenciaEntregaItem[];
    }
  | { message: string; details?: string };

const CONFIRMATION_PREFIX = 'entrega_confirmacao:';
const PAGE_SIZE = 100;
const DEFAULT_DAYS = 3;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    );
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNumeroNota(value: string | null | undefined): string {
  const digits = onlyDigits(value);
  if (!digits) return String(value || '').trim().toLowerCase();
  return digits.replace(/^0+/, '') || '0';
}

function getPedidoId(pedido: Record<string, unknown>): number {
  return (
    pickNumber(
      pedido.ORCAMENTO_ID,
      pedido.orcamento_id,
      pedido.PEDIDO_ID,
      pedido.pedido_id,
      pedido.ID,
      pedido.id
    ) || 0
  );
}

function getNumeroNotaFromNota(item: Record<string, unknown> | null | undefined): string | null {
  if (!item) return null;
  const notaFiscal =
    (item.nota_fiscal as Record<string, unknown> | undefined) ||
    (item.notaFiscal as Record<string, unknown> | undefined) ||
    item;

  return pickString(
    notaFiscal.NUMERO_NOTA,
    notaFiscal.NUMERO_NOTA_FISCAL,
    notaFiscal.numero,
    notaFiscal.NUMERO,
    notaFiscal.numeroNota
  );
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
    };
  } catch {
    return null;
  }
}

function buildConfirmationKey(controleId: string, numeroNota: string): string {
  return `${controleId}:${normalizeNumeroNota(numeroNota)}`;
}

function getOccurrenceText(event: SswTrackingOccurrence): string {
  return normalizeText(
    [
      event.ocorrencia,
      event.descricao,
      event.tipo,
      event.ocorrenciaSsw,
      event.detalhe,
      event.documentos,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function isDeliveredOccurrence(event: SswTrackingOccurrence): boolean {
  const text = getOccurrenceText(event);
  return /\b(entregue|entrega realizada|entrega efetuada|entrega concluida|entrega confirmada|recebido pelo destinatario|baixado)\b/.test(text);
}

function getDeliveryIssue(event: SswTrackingOccurrence): { message: string; date: string | null } | null {
  if (isDeliveredOccurrence(event)) return null;

  const text = getOccurrenceText(event);
  const hasProblem = /cancelad|avaria|nao entreg|devolu|recus|destinatario ausente|ausencia do destinatario|cliente (ausente|fechado)|endereco (nao |incorret|inexistent)|nao localiz|tentativa.*(sem sucesso|frustrad)|insucesso|impossivel.*entreg|extravio|sinistro|roubo|furto|mercadoria (retida|faltante)|pendencia|restricao.*entreg|aguardando (orientacao|instrucao)|mudou-se|problema/.test(
    text
  );

  if (!hasProblem) return null;

  const message =
    [
      event.ocorrencia,
      event.descricao,
      event.ocorrenciaSsw,
      event.detalhe,
      event.documentos,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' | ') || 'A transportadora informou um problema na entrega.';

  return {
    message,
    date: event.dataHoraEfetiva || event.dataHora || null,
  };
}

async function carregarPedidosPeriodo(
  dataInicio: string,
  dataFim: string,
  pedidoFiltro: string,
  clienteFiltro: string,
  username: string,
  password: string
): Promise<Array<Record<string, unknown>>> {
  const acumulado: Array<Record<string, unknown>> = [];

  for (let offset = 0; offset < 300; offset += PAGE_SIZE) {
    const page = await apiExternaService.listarPedidos(
      {
        data_inicio: dataInicio,
        data_fim: dataFim,
        tipo_data: 'recebimento',
        limit: PAGE_SIZE,
        offset,
      },
      username,
      password,
      8_000
    );

    if (!page) break;

    const items = Array.isArray(page.data) ? (page.data as Array<Record<string, unknown>>) : [];
    if (items.length === 0) break;

    acumulado.push(...items);

    if (items.length < PAGE_SIZE || (page.total && offset + items.length >= page.total)) {
      break;
    }
  }

  return acumulado.filter((pedido) => {
    const recebido = String(pedido.RECEBIDO ?? pedido.recebido ?? '').toUpperCase() === 'S';
    const dataRecebimento = parseDate(pedido.DATA_HORA_RECEBIMENTO ?? pedido.data_hora_recebimento);
    const tipoEntrega = String(pedido.TIPO_ENTREGA ?? pedido.tipo_entrega ?? '').trim().toUpperCase();
    const pedidoId = getPedidoId(pedido);
    const clienteId = pickString(pedido.CADASTRO_ID, pedido.cadastro_id, pedido.CLIENTE_ID, pedido.cliente_id);
    const pedidoMatch = !pedidoFiltro || String(pedidoId) === pedidoFiltro;
    const clienteMatch = !clienteFiltro || String(clienteId || '') === clienteFiltro;

    return (
      recebido &&
      !!dataRecebimento &&
      dateKey(dataRecebimento) >= dataInicio &&
      dateKey(dataRecebimento) <= dataFim &&
      ['ENT', 'EPG'].includes(tipoEntrega) &&
      pedidoMatch &&
      clienteMatch
    );
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Metodo nao permitido' });
  }

  const hoje = new Date();
  const dataFimDefault = dateKey(hoje);
  const dataInicioDefault = dateKey(new Date(hoje.getTime() - (DEFAULT_DAYS - 1) * 86_400_000));

  const dataInicio = first(req.query.dataInicio) || dataInicioDefault;
  const dataFim = first(req.query.dataFim) || dataFimDefault;
  const pedidoFiltro = onlyDigits(first(req.query.pedido) || '');
  const clienteFiltro = onlyDigits(first(req.query.clienteId) || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim) || dataInicio > dataFim) {
    return res.status(400).json({ message: 'Periodo invalido' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ message: 'API externa nao configurada' });
  }

  try {
    const pedidosBrutos = await carregarPedidosPeriodo(
      dataInicio,
      dataFim,
      pedidoFiltro,
      clienteFiltro,
      username,
      password
    );

    if (pedidosBrutos.length === 0) {
      return res.status(200).json({
        periodo: { dataInicio, dataFim },
        totais: { encontrados: 0 },
        data: [],
      });
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

    const itens = await Promise.all(
      pedidosBrutos.map(async (pedidoBase) => {
        const pedidoId = getPedidoId(pedidoBase);
        if (!pedidoId) return null;

        const logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password, 8_000);
        const pedido = { ...pedidoBase, ...((logistica?.pedido as Record<string, unknown>) || {}) };
        const notas = Array.isArray(logistica?.notas_fiscais)
          ? (logistica?.notas_fiscais as Array<Record<string, unknown>>)
          : [];

        const notaPrincipal = notas[0] || null;
        const numeroNota =
          pickString(
            pedido.NUMERO_NOTA,
            pedido.NUMERO_NOTA_FISCAL,
            getNumeroNotaFromNota(notaPrincipal)
          ) || null;
        const identificacaoNfe = (() => {
          const chave = onlyDigits(
            pickString(
              pedido.IDENTIFICACAO_NFE,
              pedido.CHAVE_NFE,
              notaPrincipal?.IDENTIFICACAO_NFE,
              notaPrincipal?.CHAVE_NFE
            )
          );
          return chave.length === 44 ? chave : null;
        })();

        const notaWhereClauses: Array<any> = [];
        if (identificacaoNfe) {
          notaWhereClauses.push({ codigo: identificacaoNfe });
        }
        if (numeroNota) {
          notaWhereClauses.push({ numeroNota });
          notaWhereClauses.push({ numeroNota: normalizeNumeroNota(numeroNota) });
        }

        const notaLocal = notaWhereClauses.length > 0
          ? await prisma.notaFiscal.findFirst({
              where: {
                OR: notaWhereClauses,
              },
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
            ? confirmacoes.get(buildConfirmationKey(controleId, numeroNota))
            : null;

        if (confirmacaoEntrega?.entregue) return null;
        const tracking = identificacaoNfe
          ? await fetchMergedTracking({
              chave: identificacaoNfe,
              numeroNota,
              transportadora: notaLocal?.controle?.transportadora || null,
            })
          : {
              found: false,
              delivered: false,
              status: null,
              message: 'Pedido sem chave NF-e para consultar rastreio',
              deliveredAt: null,
              receiverName: null,
              photoUrl: null,
              occurrences: [] as SswTrackingOccurrence[],
              source: null,
            };

        if (tracking.delivered) return null;

        const ultimaOcorrencia = tracking.occurrences.length > 0
          ? tracking.occurrences[tracking.occurrences.length - 1]
          : null;
        const problema = [...tracking.occurrences]
          .reverse()
          .map((occurrence) => getDeliveryIssue(occurrence))
          .find((issue) => !!issue) || null;

        let statusAtual = 'Pendente sem rastreio';
        let dataHoraStatus: string | null = null;

        if (problema) {
          statusAtual = problema.message;
          dataHoraStatus = problema.date;
        } else if (ultimaOcorrencia) {
          statusAtual =
            pickString(
              ultimaOcorrencia.ocorrencia,
              ultimaOcorrencia.descricao,
              ultimaOcorrencia.ocorrenciaSsw,
              ultimaOcorrencia.tipo
            ) || 'Pendente com rastreio';
          dataHoraStatus = ultimaOcorrencia.dataHoraEfetiva || ultimaOcorrencia.dataHora || null;
        } else if (controleId) {
          statusAtual = 'Enviado para transportadora';
        } else if (numeroNota) {
          statusAtual = 'Nota identificada aguardando evolucao';
        }

        return {
          id: `pedido-${pedidoId}`,
          pedidoId,
          clienteId: pickNumber(
            pedido.CADASTRO_ID,
            pedido.cadastro_id,
            pedido.CLIENTE_ID,
            pedido.cliente_id
          ),
          cliente:
            pickString(
              pedido.CLIENTE_NOME,
              pedido.NOME_RAZAO_SOCIAL,
              pedido.NOME_FANTASIA,
              pedido.NOME
            ) || 'Cliente nao identificado',
          vendedor:
            pickString(
              pedido.VENDEDOR_NOME,
              pedido.NOME_VENDEDOR,
              pedido.NOME_REPRESENTANTE,
              pedido.REPRESENTANTE,
              pedido.VENDEDOR
            ) || 'Sem representante',
          valor:
            pickNumber(
              pedido.VALOR_TOTAL,
              pedido.VALOR_PEDIDO,
              pedido.VALOR_TOTAL_NOTA,
              pedido.VALOR_PRODUTOS
            ) || 0,
          tipoEntrega: pickString(pedido.TIPO_ENTREGA, pedido.tipo_entrega),
          dataHoraRecebimento: pickString(
            pedido.DATA_HORA_RECEBIMENTO,
            pedido.DATA_RECEBIMENTO,
            pedido.DATA_HORA_CADASTRO,
            pedido.DATA_CADASTRO
          ),
          numeroNota,
          identificacaoNfe: identificacaoNfe || '',
          transportadora: notaLocal?.controle?.transportadora || null,
          controleId,
          statusAtual,
          dataHoraStatus,
          sswStatus: tracking.status,
          sswMensagem: tracking.message,
          ocorrencias: tracking.occurrences,
        } satisfies PendenciaEntregaItem;
      })
    );

    const itensValidos = itens.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    const data: PendenciaEntregaItem[] = itensValidos.sort((a, b) => {
      const statusA = new Date(a.dataHoraStatus || a.dataHoraRecebimento || 0).getTime();
      const statusB = new Date(b.dataHoraStatus || b.dataHoraRecebimento || 0).getTime();
      return statusB - statusA;
    });

    return res.status(200).json({
      periodo: { dataInicio, dataFim },
      totais: { encontrados: data.length },
      data,
    });
  } catch (error: any) {
    console.error('[Relatorio Pendencias Entrega] Erro:', error);
    return res.status(500).json({
      message: 'Erro ao gerar relatorio de pendencias de entrega',
      details: error?.message || 'Erro interno',
    });
  }
}
