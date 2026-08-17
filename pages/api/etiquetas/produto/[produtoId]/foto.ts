import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { fetchSantriProductPhoto } from '@/services/santri-products';

const ALLOWED_TYPES = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getAuthenticatedUser(req);
  if (!user?.ativo) return res.status(401).json({ message: 'Nao autenticado' });
  if (!ALLOWED_TYPES.includes(user.tipo)) return res.status(403).json({ message: 'Acesso negado' });

  const produtoId = typeof req.query.produtoId === 'string' ? req.query.produtoId.trim() : '';
  const ordem = typeof req.query.ordem === 'string' ? req.query.ordem.trim() : '0';
  if (!/^\d+$/.test(produtoId) || !/^\d+$/.test(ordem)) {
    return res.status(400).json({ message: 'Produto ou ordem da foto invalido' });
  }

  try {
    const photo = await fetchSantriProductPhoto(produtoId, ordem);
    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).send(photo.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar foto do produto';
    return res.status(message === 'PHOTO_NOT_FOUND' ? 404 : 502).json({ message });
  }
}
