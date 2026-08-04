import { NextApiRequest, NextApiResponse } from 'next';
import { fetchSantriProductComplete } from '@/services/santri-products';
import { getAuthenticatedUser } from '@/lib/server-auth';

const ALLOWED_TYPES = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.ativo) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!ALLOWED_TYPES.includes(user.tipo)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { produtoId } = req.query;
    if (typeof produtoId !== 'string' || !produtoId.trim()) {
      return res.status(400).json({ message: 'Código ADM inválido' });
    }

    const produto = await fetchSantriProductComplete(produtoId.trim());
    return res.status(200).json(produto);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar produto';

    if (message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Produto não encontrado para o código ADM informado.' });
    }

    if (message === 'TOKEN_EXPIRED') {
      return res.status(401).json({ message: 'Token expirado na integração com a Santri.' });
    }

    return res.status(502).json({ message });
  }
}
