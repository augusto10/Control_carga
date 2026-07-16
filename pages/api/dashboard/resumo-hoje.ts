import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import { apiExternaService } from '@/services/api-externa';

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

const DASHBOARD_CACHE_TTL_MS = 60_000;
const DASHBOARD_STALE_TTL_MS = 10 * 60_000;
const DASHBOARD_QUERY_TIMEOUT_MS = 8_000;

let dashboardCache: {
  expiresAt: number;
  staleAt: number;
  payload: DashboardResumo;
} | null = null;

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
  totalControles: 0
});

const getPedidoId = (pedido: Record<string, any>): number | null => {
  const candidates = [
    pedido.ORCAMENTO_ID,
    pedido.ORCAMENTO_BASE_ID,
    pedido.PEDIDO_ID,
    pedido.ID,
    pedido.orcamento_id,
    pedido.orcamento_base_id,
    pedido.pedido_id,
    pedido.id
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
};

const isPedidoFechado = (pedido: Record<string, any>) =>
  String(pedido.PEDIDO_FECHADO ?? pedido.pedido_fechado ?? '').toUpperCase() === 'S';

const parsePedidoDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPedidoDataHoraRecebimento = (pedido: Record<string, any>) =>
  parsePedidoDate(
    pedido.DATA_HORA_RECEBIMENTO ??
      pedido.data_hora_recebimento ??
      pedido.DATA_RECEBIMENTO ??
      pedido.data_recebimento ??
      null
  );

const isPedidoRecebido = (pedido: Record<string, any>) => {
  const recebidoFlag = String(pedido.RECEBIDO ?? pedido.recebido ?? '').toUpperCase() === 'S';
  return recebidoFlag && Boolean(getPedidoDataHoraRecebimento(pedido));
};

const isRetiraNoAto = (pedido: Record<string, any>) =>
  ['ATO', 'NDF'].includes(String(pedido.TIPO_ENTREGA ?? pedido.tipo_entrega ?? '').toUpperCase());

const getPedidosHojeDetalhados = async (dataReferencia: Date) => {
  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    return {
      pedidosHoje: 0,
      pedidosEntregaHoje: 0,
      pedidosRetiraAtoHoje: 0,
    };
  }

  const data = dataReferencia.toISOString().slice(0, 10);
  // Uma única página é suficiente para o card e evita bloquear a abertura da
  // tela com dezenas de chamadas. A página completa de pedidos faz a
  // paginação detalhada quando o usuário a acessa.
  const resultado = await withTimeout(
    apiExternaService.listarPedidos(
      {
        limit: 100,
        offset: 0,
        data_inicio: data,
        data_fim: data,
        tipo_data: 'recebimento',
      },
      username,
      password
    ),
    DASHBOARD_QUERY_TIMEOUT_MS
  );
  const pedidos: Record<string, any>[] = Array.isArray(resultado?.data) ? resultado.data : [];

  const pedidosValidos = pedidos.filter((pedido) => {
    const empresaId = Number(pedido.EMPRESA_ID ?? pedido.empresa_id ?? 0);
    const recebimento = getPedidoDataHoraRecebimento(pedido);
    return (
      empresaId === 1 &&
      isPedidoFechado(pedido) &&
      isPedidoRecebido(pedido) &&
      Boolean(recebimento) &&
      recebimento! >= startOfDay(dataReferencia) &&
      recebimento! <= endOfDay(dataReferencia)
    );
  });

  let pedidosEntregaHoje = 0;
  let pedidosRetiraAtoHoje = 0;

  for (const pedido of pedidosValidos) {
    if (isRetiraNoAto(pedido)) {
      pedidosRetiraAtoHoje += 1;
    } else {
      pedidosEntregaHoje += 1;
    }
  }

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

  res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=120');

  if (dashboardCache && dashboardCache.expiresAt > Date.now()) {
    return res.status(200).json({ ...dashboardCache.payload, cached: true });
  }

  try {
    const hoje = new Date();
    const inicio = startOfDay(hoje);
    const fim = endOfDay(hoje);

    const [
      notasHoje,
      controlesHoje,
      controlesPendentes,
      totalNotas,
      totalControles
    ] = await withTimeout(
      Promise.all([
        prisma.notaFiscal.count({
          where: {
            dataCriacao: {
              gte: inicio,
              lte: fim
            }
          }
        }),
        prisma.controleCarga.count({
          where: {
            dataCriacao: {
              gte: inicio,
              lte: fim
            }
          }
        }),
        prisma.controleCarga.count({
          where: {
            finalizado: false
          }
        }),
        prisma.notaFiscal.count(),
        prisma.controleCarga.count()
      ]),
      DASHBOARD_QUERY_TIMEOUT_MS
    );

    let pedidosHoje = 0;
    let pedidosEntregaHoje = 0;
    let pedidosRetiraAtoHoje = 0;

    try {
      ({ pedidosHoje, pedidosEntregaHoje, pedidosRetiraAtoHoje } =
        await getPedidosHojeDetalhados(hoje));
    } catch (error) {
      // A indisponibilidade da API externa não pode zerar os cards que vêm
      // do banco local nem impedir o carregamento inicial da tela.
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
      totalControles
    };

    dashboardCache = {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      staleAt: Date.now() + DASHBOARD_STALE_TTL_MS,
      payload
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Erro ao buscar resumo de hoje:', error);

    if (dashboardCache && dashboardCache.staleAt > Date.now()) {
      return res.status(200).json({
        ...dashboardCache.payload,
        stale: true,
        warning: 'Banco demorou para responder. Exibindo o ultimo resumo em cache.'
      });
    }

    return res.status(200).json({
      ...emptyResumo(),
      warning: 'Banco demorou para responder. Tente atualizar em alguns instantes.'
    });
  }
}
