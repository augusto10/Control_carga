import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';

type StatusResponse = {
  data: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  error?: string;
};

// Rota exclusiva da página /admin/pedidos/status.
// Mudanças na listagem principal de Pedidos não alteram esta consulta.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ data: [], total: 0, limit: 100, offset: 0, error: 'Método não permitido' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ data: [], total: 0, limit: 100, offset: 0, error: 'API externa não configurada' });
  }

  const requestedLimit = Number(req.query.limit ?? 100);
  const requestedOffset = Number(req.query.offset ?? 0);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 100;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

  try {
    const resultado = await apiExternaService.listarPedidos(
      { limit, offset },
      username,
      password
    );

    return res.status(200).json({
      data: (resultado?.data || []) as unknown as Record<string, unknown>[],
      total: resultado?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Pedidos Status] Erro na consulta exclusiva:', error);
    return res.status(502).json({ data: [], total: 0, limit, offset, error: 'Falha ao consultar pedidos' });
  }
}
