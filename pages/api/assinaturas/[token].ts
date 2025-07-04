import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Token inválido' });
  }

  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { token },
      include: {
        controle: true,
      },
    });

    if (!assinatura) {
      return res.status(404).json({ message: 'Assinatura não encontrada' });
    }

    res.status(200).json({ assinatura });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar assinatura' });
  }
}
