import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import { getPedidosDashboard } from '@/lib/dashboard-external-cache';

type DashboardResumo = {
  notasHoje: number;
  controlesHoje: number;
  pedidosHoje: number;
  pedidosEntregaHoje: number;
  pedidosRetiraAtoHoje: number;
  controlesPendentes: number;
  totalNotas: number;
  totalControles: number;
  cached?: boolean;
  stale?: boolean;
  warning?: string;
};

const DEFAULT_CACHE_KEY = 'sem-inicio:sem-fim';
const DASHBOARD_CACHE_TTL_MS = 30_000;
const DASHBOARD_STALE_TTL_MS = 2 * 60_000;
const DASHBOARD_QUERY_TIMEOUT_MS = 8_000;

let dashboardCache: {
  expiresAt: number;
  staleAt: number;
  payload: DashboardResumo;
} | null = null;
const dashboardCacheByPeriodo = new Map<
  string,
  {
    expiresAt: number;
    staleAt: number;
    payload: DashboardResumo;
  }
>();

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('dashboard_timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const emptyResumo = (): DashboardResumo => ({
  notasHoje: 0,
  controlesHoje: 0,
  pedidosHoje: 0,
  pedidosEntregaHoje: 0,
  pedidosRetiraAtoHoje: 0,
  controlesPendentes: 0,
  totalNotas: 0,
  totalControles: 0,
});

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
    cacheKey: `${dataInicio ? formatDateOnly(dataInicio) : 'sem-inicio'}:${dataFim ? formatDateOnly(dataFim) : 'sem-fim'}`,
  };
};

const getCacheByPeriodo = (cacheKey: string) =>
  cacheKey === DEFAULT_CACHE_KEY ? dashboardCache : dashboardCacheByPeriodo.get(cacheKey);

const setCacheByPeriodo = (cacheKey: string, payload: DashboardResumo) => {
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

const isPedidoFechado = (pedido: Record<string, unknown>) =>
  String(pedido.PEDIDO_FECHADO ?? pedido.pedido_fechado ?? '').toUpperCase() === 'S';

const parsePedidoDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

const isPedidoEntrega = (pedido: Record<string, unknown>) =>
  ['ENT', 'EPG'].includes(
    String(pedido.TIPO_ENTREGA ?? pedido.tipo_entrega ?? '').toUpperCase()
  );

const getPedidosPeriodoDetalhados = async (dataInicio: Date, dataFim: Date) => {
  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    return {
      pedidosHoje: 0,
      pedidosEntregaHoje: 0,
      pedidosRetiraAtoHoje: 0,
    };
  }

  // A API externa pode retornar vazio quando recebe filtro de periodo.
  // Para a home, carregamos a pagina recente e filtramos localmente.
  const pedidos =
    (await withTimeout(getPedidosDashboard(username, password, 100), DASHBOARD_QUERY_TIMEOUT_MS)) || [];

  const pedidosValidos = pedidos.filter((pedido) => {
    const empresaId = Number(pedido.EMPRESA_ID ?? pedido.empresa_id ?? 0);
    const recebimento = getPedidoDataHoraRecebimento(pedido);

    return (
      empresaId === 1 &&
      isPedidoFechado(pedido) &&
      isPedidoRecebido(pedido) &&
      Boolean(recebimento) &&
      recebimento! >= dataInicio &&
      recebimento! <= dataFim
    );
  });

  const pedidosEntregaHoje = pedidosValidos.filter(isPedidoEntrega).length;
  const pedidosRetiraAtoHoje = pedidosValidos.filter((pedido) => !isPedidoEntrega(pedido)).length;

  return {
    pedidosHoje: pedidosValidos.length,
    pedidosEntregaHoje,
    pedidosRetiraAtoHoje,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const forceRefresh = String(req.query.force || '').trim() === '1';
  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
  let periodoFiltro: ReturnType<typeof getPeriodoFiltro>;
  try {
    periodoFiltro = getPeriodoFiltro(req);
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'periodo_invalido'
        ? 'Data inicial nao pode ser maior que a data final.'
        : 'Periodo informado invalido.';
    return res.status(400).json({ message });
  }
  const cacheAtual = getCacheByPeriodo(periodoFiltro.cacheKey);

  if (!forceRefresh && cacheAtual && cacheAtual.expiresAt > Date.now()) {
    return res.status(200).json({ ...cacheAtual.payload, cached: true });
  }

  try {
    const hoje = new Date();
    const inicio = periodoFiltro.dataInicio ? startOfDay(periodoFiltro.dataInicio) : startOfDay(hoje);
    const fim = periodoFiltro.dataFim ? endOfDay(periodoFiltro.dataFim) : endOfDay(hoje);

    const [notasHoje, controlesHoje, controlesPendentes, totalNotas, totalControles] =
      await withTimeout(
        Promise.all([
          prisma.notaFiscal.count({
            where: {
              dataCriacao: {
                gte: inicio,
                lte: fim,
              },
            },
          }),
          prisma.controleCarga.count({
            where: {
              dataCriacao: {
                gte: inicio,
                lte: fim,
              },
            },
          }),
          prisma.controleCarga.count({
            where: {
              finalizado: false,
            },
          }),
          prisma.notaFiscal.count(),
          prisma.controleCarga.count(),
        ]),
        DASHBOARD_QUERY_TIMEOUT_MS
      );

    let pedidosHoje = 0;
    let pedidosEntregaHoje = 0;
    let pedidosRetiraAtoHoje = 0;

    try {
      ({ pedidosHoje, pedidosEntregaHoje, pedidosRetiraAtoHoje } =
        await getPedidosPeriodoDetalhados(inicio, fim));
    } catch (error) {
      console.error('Erro ao buscar pedidos de hoje:', error);
    }

    const payload: DashboardResumo = {
      notasHoje,
      controlesHoje,
      pedidosHoje,
      pedidosEntregaHoje,
      pedidosRetiraAtoHoje,
      controlesPendentes,
      totalNotas,
      totalControles,
    };

    setCacheByPeriodo(periodoFiltro.cacheKey, payload);

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Erro ao buscar resumo de hoje:', error);
    const cacheStale = getCacheByPeriodo(periodoFiltro.cacheKey);

    if (cacheStale && cacheStale.staleAt > Date.now()) {
      return res.status(200).json({
        ...cacheStale.payload,
        stale: true,
        warning: 'Banco demorou para responder. Exibindo o ultimo resumo em cache.',
      });
    }

    return res.status(200).json({
      ...emptyResumo(),
      warning: 'Banco demorou para responder. Tente atualizar em alguns instantes.',
    });
  }
}
