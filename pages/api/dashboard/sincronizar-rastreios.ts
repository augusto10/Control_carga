import type { NextApiRequest, NextApiResponse } from 'next';
import { sincronizarCacheSituacoesEntrega } from '@/lib/pedido-entrega';
import prisma from '@/lib/prisma';

const isAuthorized = (req: NextApiRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const header = req.headers.authorization || '';
  const token = Array.isArray(header) ? header[0] : header;
  return token === `Bearer ${cronSecret}` || req.query.secret === cronSecret;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  if (!isAuthorized(req)) return res.status(401).json({ error: 'Nao autorizado' });

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  try {
    const pedidos = await (prisma as any).pedidoLogisticaSnapshot.findMany({
      where: {
        embarcadoNoControle: true,
        tipoEntrega: { in: ['ENT', 'EPG'] },
      },
      select: {
        pedidoId: true,
        chaveNfe: true,
        numeroNota: true,
        transportadoraNome: true,
      },
      orderBy: { dataHoraControle: 'asc' },
      take: 1500,
    });
    const resultado = await sincronizarCacheSituacoesEntrega(pedidos, new Date(), 20);
    return res.status(200).json({ ok: true, candidatos: pedidos.length, ...resultado });
  } catch (error) {
    console.error('[Sincronizacao Rastreios] Erro:', error);
    return res.status(503).json({
      error: 'Nao foi possivel atualizar o cache de rastreio SSW',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
