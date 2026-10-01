import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, ativo } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID é obrigatório' });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        ativo: !!ativo,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
      },
    });

    return res.status(200).json(usuario);
  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
