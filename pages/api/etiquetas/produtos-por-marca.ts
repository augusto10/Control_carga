import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { getLabelProductsCatalogInfo, searchLabelProductsByBrand } from '@/lib/label-products-catalog';

const ALLOWED_TYPES = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Metodo nao permitido.' });

  const user = await getAuthenticatedUser(req);
  if (!user || !user.ativo) return res.status(401).json({ message: 'Nao autenticado.' });
  if (!ALLOWED_TYPES.includes(user.tipo)) return res.status(403).json({ message: 'Acesso negado.' });

  const marca = typeof req.query.marca === 'string' ? req.query.marca.trim() : '';
  if (marca.length < 2) return res.status(400).json({ message: 'Digite pelo menos 2 caracteres da marca.' });

  try {
    const produtos = searchLabelProductsByBrand(marca);
    const catalogo = getLabelProductsCatalogInfo();
    return res.status(200).json({ marca, produtos, total: produtos.length, catalogo });
  } catch (error) {
    console.error('[etiquetas/produtos-por-marca]', error);
    return res.status(502).json({
      message: error instanceof Error ? error.message : 'Nao foi possivel consultar os produtos da marca.',
    });
  }
}
