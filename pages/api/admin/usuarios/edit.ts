import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { camposAdm } from '@/lib/usuario-adm';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!['ADMIN', 'GERENTE'].includes(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito à administração.' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, nome, tipo, senha, ativo } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID é obrigatório' });
    }

    let adm: ReturnType<typeof camposAdm>;
    try { adm = camposAdm(req.body); } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }

    const data: any = {
      ...adm,
      nome,
      tipo,
      ativo,
    };

    if (senha && senha.trim() !== '') {
      data.senha = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        codigoAdm: true,
        tipo: true,
        ativo: true,
      },
    });

    return res.status(200).json(usuario);
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
