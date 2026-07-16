import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';

// Rota exclusiva da página de resumo diário de pedidos.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ data: [], total: 0, error: 'Método não permitido' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ data: [], total: 0, error: 'API externa não configurada' });
  }

  const data = typeof req.query.data === 'string' ? req.query.data : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ data: [], total: 0, error: 'Data inválida' });
  }

  try {
    const resultado = await apiExternaService.listarPedidos(
      {
        limit: 100,
        offset: 0,
        data_inicio: data,
        data_fim: data,
        tipo_data: 'recebimento',
      },
      username,
      password
    );

    return res.status(200).json({
      data: resultado?.data || [],
      total: resultado?.total || 0,
    });
  } catch (error) {
    console.error('[Resumo Diário] Erro na consulta exclusiva:', error);
    return res.status(502).json({ data: [], total: 0, error: 'Falha ao consultar pedidos' });
  }
}
