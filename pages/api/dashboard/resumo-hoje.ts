import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

type DashboardResumo = {
  notasHoje: number;
  controlesHoje: number;
  pedidosHoje: number;
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
  controlesPendentes: 0,
  totalNotas: 0,
  totalControles: 0
});

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
      pedidosHoje,
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
        prisma.pedido.count({
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

    const payload: DashboardResumo = {
      notasHoje,
      controlesHoje,
      pedidosHoje,
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
