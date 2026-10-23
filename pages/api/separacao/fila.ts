import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withTotemOrAuth } from '@/lib/middleware/withTotemOrAuth';
import { calcularFilaSeparacao } from '@/lib/separacao-fila';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    if (!username || !password) {
      return res.status(500).json({ success: false, message: 'Credenciais da API externa não configuradas' });
    }

    const fila = await calcularFilaSeparacao({ username, password });

    return res.status(200).json({
      success: true,
      total: fila.length,
      proximo: fila[0] ?? null,
      fila,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}

export default withTotemOrAuth(handler);
