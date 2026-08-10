import { NextApiRequest, NextApiResponse } from 'next';
import { TipoUsuario } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { buscarLoteRepo } from '@/lib/etiquetas-repo';

const ALLOWED_ROLES: TipoUsuario[] = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);

  if (!user || !user.ativo) {
    return res.status(401).json({ message: 'Nao autorizado.' });
  }

  if (!ALLOWED_ROLES.includes(user.tipo)) {
    return res.status(403).json({ message: 'Voce nao tem permissao para imprimir etiquetas de transporte.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo nao permitido.' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID do lote invalido.' });
  }

  try {
    const lote = await buscarLoteRepo(id);
    if (!lote) {
      return res.status(404).json({ message: 'Lote de etiquetas nao encontrado.' });
    }

    const result = await prisma.etiquetaVolume.updateMany({
      where: { loteId: id },
      data: { impressoEm: new Date() },
    });

    return res.status(200).json({ marcaImpressao: result.count, loteId: id });
  } catch (error) {
    console.error('[etiquetas/lotes/imprimir] Erro:', error);
    return res.status(500).json({ message: 'Erro interno ao registrar a impressao.' });
  }
}
