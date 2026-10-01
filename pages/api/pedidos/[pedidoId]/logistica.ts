import { buscarLogisticaAtual } from '@/lib/pedido-logistica-atual';
import prisma from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';
import { fetchMergedTracking } from '@/services/sswTracking';
import { buscarPrazoDaRota, type RotaPrazoEntrega } from '@/lib/rota-prazo-entrega';

const PEDIDO_LOGISTICA_CACHE_TTL_MS = 60_000;
const SSW_TRACKING_CACHE_TTL_MS = 30 * 60_000;

type PedidoLogisticaResponse = {
  pedido: Record<string, any>;
  logistica: Record<string, any> | null;
  prazoEntregaRota?: string | null;
  ssw?: {
    found: boolean;
    delivered: boolean;
    status: string | null;
    message: string | null;
    deliveredAt: string | null;
    receiverName: string | null;
    photoUrl: string | null;
    occurrences: Array<{
      dataHora: string | null;
      ocorrencia: string | null;
      descricao: string | null;
      cidade: string | null;
      dominio: string | null;
    }>;
  } | null;
};

const pedidoLogisticaCache = new Map<
  string,
  {
    expiresAt: number;
    payload: PedidoLogisticaResponse;
  }
>();
const sswOnlyCache = new Map<string, { expiresAt: number; payload: NonNullable<PedidoLogisticaResponse['ssw']> }>();

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

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

const pickChaveNfe = (...values: Array<unknown>) => {
  for (const value of values) {
    const chave = onlyDigits(value);
    if (chave.length === 44) return chave;
  }
  return null;
};

const variacoesNumeroNota = (value: string | null) => {
  if (!value) return [];
  const digits = onlyDigits(value);
  const semZeros = digits.replace(/^0+/, '') || (digits ? '0' : '');
  return [...new Set([value.trim(), digits, semZeros, semZeros ? semZeros.padStart(9, '0') : ''].filter(Boolean))];
};

const mergePedidoComLogistica = (
  pedidoBase: Record<string, any>,
  logistica: Record<string, any> | null
) => {
  const pedidoLogistica = (logistica?.pedido || {}) as Record<string, any>;
  const notaFiscal = Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0] || {} : {};
  const entrega = Array.isArray(logistica?.entregas) ? logistica.entregas[0] || {} : {};

  return {
    ...pedidoBase,
    ...pedidoLogistica,
    NUMERO_NOTA:
      pickString(pedidoLogistica.NUMERO_NOTA, notaFiscal.NUMERO_NOTA, pedidoBase.NUMERO_NOTA) ?? null,
    IDENTIFICACAO_NFE:
      pickString(
        pedidoLogistica.IDENTIFICACAO_NFE,
        notaFiscal.IDENTIFICACAO_NFE,
        pedidoBase.IDENTIFICACAO_NFE
      ) ?? null,
    NOME_BAIRRO_NOTA:
      pickString(
        pedidoLogistica.BAIRRO_ENTREGA_NOME,
        pedidoLogistica.BAIRRO_CADASTRO_NOME,
        pedidoBase.NOME_BAIRRO_NOTA,
        pedidoBase.BAIRRO
      ) ?? null,
    NOME_CIDADE:
      pickString(
        pedidoLogistica.CIDADE_ENTREGA_NOME,
        pedidoLogistica.CIDADE_CADASTRO_NOME,
        pedidoBase.NOME_CIDADE,
        pedidoBase.CIDADE
      ) ?? null,
    ESTADO_DESTINO:
      pickString(
        pedidoLogistica.ESTADO_ENTREGA_ID,
        pedidoLogistica.UF_ENTREGA,
        pedidoLogistica.ESTADO_CADASTRO_ID,
        pedidoLogistica.UF_CADASTRO,
        pedidoBase.ESTADO_DESTINO,
        pedidoBase.UF
      ) ?? null,
    CEP:
      pickString(
        pedidoLogistica.CEP_ENTREGA,
        pedidoBase.CEP,
        pedidoBase.CEP_ENTREGA,
        pedidoBase.CEP_CONS_FINAL
      ) ?? null,
    TIPO_ENTREGA:
      pickString(
        pedidoLogistica.TIPO_ENTREGA,
        entrega.ENTREGA_NO_ATO === 'S' ? 'ATO' : null,
        pedidoBase.TIPO_ENTREGA
      ) ?? null,
    RECEBIDO: pickString(pedidoLogistica.RECEBIDO, pedidoBase.RECEBIDO) ?? null,
    DATA_HORA_RECEBIMENTO:
      pickString(pedidoLogistica.DATA_HORA_RECEBIMENTO, pedidoBase.DATA_HORA_RECEBIMENTO) ?? null,
    _logistica: logistica,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const { pedidoId } = req.query;
  const id = Array.isArray(pedidoId) ? pedidoId[0] : pedidoId;

  if (!id) {
    return res.status(400).json({ error: 'pedidoId e obrigatorio' });
  }

  const sswOnly = String(req.query.sswOnly || '') === '1';
  const chaveNfeInformada = pickChaveNfe(Array.isArray(req.query.chaveNfe) ? req.query.chaveNfe[0] : req.query.chaveNfe);
  const numeroNotaInformado = pickString(Array.isArray(req.query.numeroNota) ? req.query.numeroNota[0] : req.query.numeroNota);
  const transportadoraInformada = pickString(Array.isArray(req.query.transportadora) ? req.query.transportadora[0] : req.query.transportadora);

  if (sswOnly) {
    const notaNoControle = !chaveNfeInformada && numeroNotaInformado
      ? await prisma.notaFiscal.findFirst({
          where: {
            controleId: { not: null },
            numeroNota: { in: variacoesNumeroNota(numeroNotaInformado) },
          },
          select: { codigo: true },
          orderBy: { dataCriacao: 'desc' },
        })
      : null;
    const chaveNfe = pickChaveNfe(chaveNfeInformada, notaNoControle?.codigo);

    if (!chaveNfe) {
      return res.status(200).json({ ssw: {
        found: false,
        delivered: false,
        status: 'NAO_CONSULTADO',
        message: 'Chave da nota fiscal indisponível para consulta SSW.',
        deliveredAt: null,
        receiverName: null,
        photoUrl: null,
        occurrences: [],
      } });
    }

    const sswCacheKey = `${chaveNfe}:${numeroNotaInformado || ''}:${transportadoraInformada || ''}`;
    const cachedSsw = sswOnlyCache.get(sswCacheKey);
    if (cachedSsw && cachedSsw.expiresAt > Date.now()) {
      return res.status(200).json({ ssw: cachedSsw.payload });
    }

    try {
      const tracking = await fetchMergedTracking({
        chave: chaveNfe,
        numeroNota: numeroNotaInformado,
        transportadora: transportadoraInformada,
      });
      const payload = {
        found: tracking.found,
        delivered: tracking.delivered,
        status: tracking.status || null,
        message: tracking.message || null,
        deliveredAt: tracking.deliveredAt || null,
        receiverName: tracking.receiverName || null,
        photoUrl: tracking.photoUrl || null,
        occurrences: (tracking.occurrences || []).map((occurrence) => ({
          dataHora: occurrence.dataHoraEfetiva || occurrence.dataHora || null,
          ocorrencia: occurrence.ocorrencia || occurrence.ocorrenciaSsw || null,
          descricao: occurrence.descricao || occurrence.detalhe || null,
          cidade: occurrence.cidade || null,
          dominio: occurrence.dominio || null,
        })),
      };
      sswOnlyCache.set(sswCacheKey, { expiresAt: Date.now() + SSW_TRACKING_CACHE_TTL_MS, payload });
      return res.status(200).json({ ssw: payload });
    } catch {
      return res.status(200).json({ ssw: {
        found: false,
        delivered: false,
        status: 'ERRO_CONSULTA',
        message: 'Não foi possível obter uma resposta da consulta SSW.',
        deliveredAt: null,
        receiverName: null,
        photoUrl: null,
        occurrences: [],
      } });
    }
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ error: 'Credenciais da API externa nao configuradas' });
  }

  const cacheKey = `${id}:${chaveNfeInformada || ''}:${numeroNotaInformado || ''}:${transportadoraInformada || ''}`;
  const cached = pedidoLogisticaCache.get(cacheKey);
  if (
    cached &&
    cached.expiresAt > Date.now() &&
    Object.prototype.hasOwnProperty.call(cached.payload, 'prazoEntregaRota')
  ) {
    return res.status(200).json(cached.payload);
  }
  if (cached) pedidoLogisticaCache.delete(cacheKey);

  try {
    const logistica = await buscarLogisticaAtual(id, username, password);
    const pedidoBase = await apiExternaService.buscarPedidoPorId(String(id), username, password);

    if (!logistica && !pedidoBase) {
      return res.status(404).json({ error: 'Pedido nao encontrado' });
    }

    const pedidoDetalhado: Record<string, any> = mergePedidoComLogistica(
      (pedidoBase || {}) as Record<string, any>,
      logistica as Record<string, any> | null
    );

    const numeroNota =
      pickString(
        numeroNotaInformado,
        pedidoDetalhado.NUMERO_NOTA,
        pedidoDetalhado.NUMERO_NOTA_FISCAL,
        logistica?.pedido?.NUMERO_NOTA,
        logistica?.pedido?.NUMERO_NOTA_FISCAL,
        Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.NUMERO_NOTA : null,
        Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.NUMERO_NOTA_FISCAL : null
      ) || null;
    const notaNoControle = numeroNota
      ? await prisma.notaFiscal.findFirst({
          where: {
            controleId: { not: null },
            numeroNota: { in: variacoesNumeroNota(numeroNota) },
          },
          select: { codigo: true },
          orderBy: { dataCriacao: 'desc' },
        })
      : null;
    const chaveNfe = pickChaveNfe(
      chaveNfeInformada,
      notaNoControle?.codigo,
      pedidoDetalhado.IDENTIFICACAO_NFE,
      pedidoDetalhado.CHAVE_NFE,
      logistica?.pedido?.IDENTIFICACAO_NFE,
      logistica?.pedido?.CHAVE_NFE,
      Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.IDENTIFICACAO_NFE : null,
      Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.CHAVE_NFE : null
    );
    const transportadora = pickString(
      transportadoraInformada,
      logistica?.pedido?.TRANSPORTADORA,
      logistica?.pedido?.transportadora,
      Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.TRANSPORTADORA : null,
      Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0]?.transportadora : null,
      pedidoDetalhado.TRANSPORTADORA,
      pedidoDetalhado.transportadora
    ) || null;
    let prazoEntregaRota: string | null = null;
    try {
      const rotas: RotaPrazoEntrega[] = await prisma.rotaPrazoEntrega.findMany({
        where: { ativo: true },
        select: { codigo: true, uf: true, prazo: true, transportadora: true, ativo: true },
      });
      prazoEntregaRota = buscarPrazoDaRota({
        bairro: pickString(pedidoDetalhado.NOME_BAIRRO_NOTA, pedidoDetalhado.BAIRRO),
        cidade: pickString(pedidoDetalhado.NOME_CIDADE, pedidoDetalhado.CIDADE),
        uf: pickString(pedidoDetalhado.ESTADO_DESTINO, pedidoDetalhado.UF),
        transportadora,
      }, rotas);
    } catch (error) {
      console.error('[Pedido Logistica] Falha ao consultar prazo da rota:', error);
    }

    const ssw =
      chaveNfe
        ? await fetchMergedTracking({
            chave: chaveNfe,
            numeroNota,
            transportadora,
          }).then((tracking) => ({
            found: tracking.found,
            delivered: tracking.delivered,
            status: tracking.status || null,
            message: tracking.message || null,
            deliveredAt: tracking.deliveredAt || null,
            receiverName: tracking.receiverName || null,
            photoUrl: tracking.photoUrl || null,
            occurrences: (tracking.occurrences || []).map((occurrence) => ({
              dataHora: occurrence.dataHoraEfetiva || occurrence.dataHora || null,
              ocorrencia: occurrence.ocorrencia || occurrence.ocorrenciaSsw || null,
              descricao: occurrence.descricao || occurrence.detalhe || null,
              cidade: occurrence.cidade || null,
              dominio: occurrence.dominio || null,
            })),
          })).catch(() => ({
            found: false,
            delivered: false,
            status: 'ERRO_CONSULTA',
            message: 'Não foi possível obter uma resposta da consulta SSW.',
            deliveredAt: null,
            receiverName: null,
            photoUrl: null,
            occurrences: [],
          }))
        : {
            found: false,
            delivered: false,
            status: 'NAO_CONSULTADO',
            message: chaveNfe
              ? 'A chave da nota fiscal não possui 44 dígitos; a consulta SSW não foi realizada.'
              : 'Pedido sem chave de nota fiscal disponível para consulta SSW.',
            deliveredAt: null,
            receiverName: null,
            photoUrl: null,
            occurrences: [],
          };

    const payload: PedidoLogisticaResponse = {
      pedido: {
        ...pedidoDetalhado,
        NUMERO_NOTA: numeroNota || pedidoDetalhado.NUMERO_NOTA || null,
        IDENTIFICACAO_NFE: chaveNfe || pedidoDetalhado.IDENTIFICACAO_NFE || null,
        CHAVE_NFE: chaveNfe || pedidoDetalhado.CHAVE_NFE || null,
      },
      logistica,
      prazoEntregaRota,
      ssw,
    };

    pedidoLogisticaCache.set(cacheKey, {
      expiresAt: Date.now() + PEDIDO_LOGISTICA_CACHE_TTL_MS,
      payload,
    });

    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro ao buscar logistica do pedido',
      details: error?.message || 'Erro desconhecido',
    });
  }
}
