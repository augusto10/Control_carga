import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withAuth } from '@/lib/middleware/withAuth';
import prisma from '@/lib/prisma';
import {
  criptografarTemplateBiometrico,
  validarTemplateBiometrico,
} from '@/lib/biometria';

const ADMIN_ROLES = new Set(['ADMIN', 'GERENTE']);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!ADMIN_ROLES.has(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito à administração.' });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : '';
  if (!id) return res.status(400).json({ message: 'ID do usuário é obrigatório.' });

  try {
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!usuarioExistente) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const biometria =
      req.method === 'DELETE'
        ? null
        : typeof req.body?.template === 'string' && validarTemplateBiometrico(req.body.template)
          ? criptografarTemplateBiometrico(req.body.template)
          : undefined;

    if (biometria === undefined) {
      return res.status(400).json({ message: 'A captura biométrica está inválida.' });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { biometria },
      select: { id: true, nome: true },
    });

    return res.status(200).json({ id: usuario.id, nome: usuario.nome, temBiometria: biometria !== null });
  } catch (error) {
    console.error('Erro ao atualizar biometria do usuário:', error);
    return res.status(500).json({ message: 'Não foi possível atualizar a biometria.' });
  }
}

export default withAuth(handler);
