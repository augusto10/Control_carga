import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { expiresAt: number; payload: any }>();
const LOGISTICA_CACHE_TTL_MS = 30 * 60_000;
const logisticaCache = new Map<number, { expiresAt: number; payload: any }>();
const CACHE_VERSION = 'v2';

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const normalizeNota = (value: unknown) => digits(value).replace(/^0+/, '') || '0';
const pick = (...values: unknown[]) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');

const parseDate = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const diffDaysInclusive = (dataInicio: string, dataFim: string) => {
  const inicio = new Date(`${dataInicio}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);
  const diffMs = fim.getTime() - inicio.getTime();
  return Math.max(1, Math.floor(diffMs / 86_400_000) + 1);
};

const mapLimit = async <T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) => {
  const result = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return result;
};

const getPedidoId = (pedido: any) => Number(
  pedido?.ORCAMENTO_ID ??
  pedido?.orcamento_id ??
  pedido?.PEDIDO_ID ??
  pedido?.pedido_id ??
  pedido?.id
);

const getPedidoLogisticaCached = async (
  pedidoId: number,
  username: string,
  password: string
) => {
  const cached = logisticaCache.get(pedidoId);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  const payload = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
  logisticaCache.set(pedidoId, { expiresAt: Date.now() + LOGISTICA_CACHE_TTL_MS, payload });
  return payload;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Metodo nao permitido' });

  const hoje = dateKey(new Date());
  const dataInicio = first(req.query.dataInicio) || hoje;
  const dataFim = first(req.query.dataFim) || dataInicio;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim) || dataInicio > dataFim) {
    return res.status(400).json({ message: 'Periodo invalido' });
  }

  const cacheKey = `${CACHE_VERSION}:${dataInicio}:${dataFim}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.status(200).json({ ...cached.payload, cache: true });

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password) return res.status(500).json({ message: 'API externa nao configurada' });

  try {
    const pageSize = 100;
    const periodoDias = diffDaysInclusive(dataInicio, dataFim);
    const limiteBuscaFiltrada =
      periodoDias <= 1 ? 100 :
      periodoDias <= 3 ? 300 :
      periodoDias <= 7 ? 500 :
      700;
    const limiteBuscaFallback =
      periodoDias <= 1 ? 200 :
      periodoDias <= 3 ? 400 :
      periodoDias <= 7 ? 700 :
      1000;

    const carregarPedidos = async (usarFiltroRecebimento: boolean, limiteBusca: number) => {
      const acumulado: any[] = [];
      let houveRespostaValida = false;
      for (let offset = 0; offset < limiteBusca; offset += pageSize) {
        const page = await apiExternaService.listarPedidos(
          usarFiltroRecebimento
            ? {
                data_inicio: dataInicio,
                data_fim: dataFim,
                tipo_data: 'recebimento',
                limit: pageSize,
                offset,
              }
            : { limit: pageSize, offset },
          username,
          password
        );
        if (!page) {
          if (!houveRespostaValida) return null;
          break;
        }
        houveRespostaValida = true;
        const items = Array.isArray(page?.data) ? page.data : [];
        if (items.length === 0) break;
        acumulado.push(...items);
        if (items.length < pageSize || (page?.total && offset + items.length >= page.total)) break;
      }
      return acumulado;
    };

    const filtrarRecebidos = (pedidosBrutos: any[]) => pedidosBrutos.filter((pedido: any) => {
      const recebido = String(pedido.RECEBIDO ?? pedido.recebido ?? '').toUpperCase();
      const data = parseDate(pedido.DATA_HORA_RECEBIMENTO ?? pedido.data_hora_recebimento);
      return recebido === 'S' && data && dateKey(data) >= dataInicio && dateKey(data) <= dataFim;
    });

    let pedidosBrutos = await carregarPedidos(true, limiteBuscaFiltrada);
    let recebidos = Array.isArray(pedidosBrutos) ? filtrarRecebidos(pedidosBrutos) : [];

    if (recebidos.length === 0) {
      // Fallback para ambientes em que a API ignora o filtro por tipo_data/periodo
      // ou retorna uma janela inicial que ainda nao contem os pedidos recebidos.
      pedidosBrutos = await carregarPedidos(false, limiteBuscaFallback);
      recebidos = Array.isArray(pedidosBrutos) ? filtrarRecebidos(pedidosBrutos) : [];
    }

    if (!Array.isArray(pedidosBrutos)) {
      throw new Error('Falha ao consultar pedidos na API externa');
    }

    const pedidos = await mapLimit(recebidos, 16, async (base: any) => {
      const pedidoId = getPedidoId(base);
      const logistica: any = Number.isFinite(pedidoId)
        ? await getPedidoLogisticaCached(pedidoId, username, password)
        : null;
      const pedido = { ...base, ...(logistica?.pedido || {}) };
      const entregas = Array.isArray(logistica?.entregas) ? logistica.entregas : [];
      const notas = Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais : [];
      const dataRecebimento = parseDate(pedido.DATA_HORA_RECEBIMENTO ?? base.DATA_HORA_RECEBIMENTO);
      const segundos = dataRecebimento ? dataRecebimento.getHours() * 3600 + dataRecebimento.getMinutes() * 60 + dataRecebimento.getSeconds() : 0;
      const entregaGerada = entregas.some((entrega: any) => Boolean(entrega.ENTREGA_ID ?? entrega.entrega_id));
      return {
        pedidoId,
        cliente: pedido.CLIENTE_NOME ?? pedido.NOME_FANTASIA ?? 'Sem cliente',
        vendedor: pedido.VENDEDOR_NOME ?? pedido.VENDEDOR_ID ?? 'Sem vendedor',
        tipoEntrega: pedido.TIPO_ENTREGA ?? null,
        dataHoraRecebimento: dataRecebimento?.toISOString() ?? null,
        dentroCorte: segundos <= 16 * 3600,
        entregaGerada,
        entregaIds: entregas.map((entrega: any) => entrega.ENTREGA_ID ?? entrega.entrega_id).filter(Boolean),
        entregue: entregas.some((entrega: any) => String(entrega.ENTREGUE ?? '').toUpperCase() === 'S'),
        numeroNotas: notas.map((nota: any) => nota.NUMERO_NOTA).filter(Boolean),
        valor: Number(pedido.VALOR_PEDIDO ?? pedido.VALOR_TOTAL ?? 0) || 0,
      };
    });

    const inicioUtc = new Date(`${dataInicio}T00:00:00-03:00`);
    const fimUtc = new Date(`${dataFim}T23:59:59.999-03:00`);
    const controlesDb = await prisma.controleCarga.findMany({
      where: { finalizado: true, dataCriacao: { gte: inicioUtc, lte: fimUtc } },
      include: { notas: true },
      orderBy: { dataCriacao: 'asc' },
    });

    const notasProcuradas = new Set(controlesDb.flatMap((controle) => controle.notas.map((nota) => normalizeNota(nota.numeroNota))));
    const completas = new Map<string, any>();
    if (notasProcuradas.size > 0) {
      const limit = 500;
      for (let offset = 0; offset < 5000; offset += limit) {
        const page = await apiExternaService.listarNotasFiscaisCompletas({ limit, offset }, username, password);
        const items = Array.isArray(page?.data) ? page.data : [];
        if (items.length === 0) break;
        for (const item of items as any[]) {
          const nota = item.nota_fiscal || item.notaFiscal || {};
          const numero = normalizeNota(pick(nota.NUMERO_NOTA, nota.numero, item.NUMERO_NOTA));
          if (notasProcuradas.has(numero)) completas.set(numero, { ...item, ...(item.pedido || {}), ...nota });
        }
        if (completas.size >= notasProcuradas.size || items.length < limit || (page?.total && offset + items.length >= page.total)) break;
      }
    }

    const controles = controlesDb.map((controle) => {
      const notas = controle.notas.map((nota) => {
        const externa = completas.get(normalizeNota(nota.numeroNota)) || {};
        return {
          numeroNota: nota.numeroNota,
          codigo: nota.codigo,
          volumes: nota.volumes,
          valor: Number(pick(externa.VALOR_TOTAL_NOTA, externa.VALOR_PEDIDO, externa.VALOR_TOTAL, externa.valor) ?? 0) || 0,
          peso: Number(pick(externa.PESO_BRUTO, externa.PESO_TOTAL, externa.pesoBruto, externa.peso) ?? 0) || 0,
        };
      });
      return {
        id: controle.id,
        numeroManifesto: controle.numeroManifesto,
        dataCriacao: controle.dataCriacao.toISOString(),
        motorista: controle.motorista,
        transportadora: controle.transportadora,
        placaVeiculo: controle.placaVeiculo,
        totalNotas: notas.length,
        valor: notas.reduce((sum, nota) => sum + nota.valor, 0),
        peso: notas.reduce((sum, nota) => sum + nota.peso, 0),
        notas,
      };
    });

    const dentro = pedidos.filter((pedido) => pedido.dentroCorte);
    const fora = pedidos.filter((pedido) => !pedido.dentroCorte);
    const resumoGrupo = (items: typeof pedidos) => ({
      total: items.length,
      geradas: items.filter((item) => item.entregaGerada).length,
      naoGeradas: items.filter((item) => !item.entregaGerada).length,
      valor: items.reduce((sum, item) => sum + item.valor, 0),
    });

    const payload = {
      periodo: { dataInicio, dataFim, horarioCorte: '16:00:00', referencia: 'DATA_HORA_RECEBIMENTO' },
      totais: {
        ...resumoGrupo(pedidos),
        caminhoesCarregados: controles.length,
        notasCarregadas: controles.reduce((sum, controle) => sum + controle.totalNotas, 0),
        valorCarregado: controles.reduce((sum, controle) => sum + controle.valor, 0),
        pesoCarregado: controles.reduce((sum, controle) => sum + controle.peso, 0),
      },
      corte: { dentro: resumoGrupo(dentro), fora: resumoGrupo(fora) },
      pedidos,
      controles,
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('[Relatorio Entregas] Erro:', error);
    return res.status(500).json({ message: 'Erro ao gerar relatorio de entregas', details: error?.message });
  }
}
