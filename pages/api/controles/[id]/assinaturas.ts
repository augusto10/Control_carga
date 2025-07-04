import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'ID do controle é obrigatório' });
    }

    const assinaturas = await prisma.assinatura.findMany({
      where: {
        controleId: id as string,
      },
      orderBy: {
        dataCriacao: 'desc',
      },
    });

    res.status(200).json(assinaturas);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    res.status(500).json({ message: 'Erro ao buscar assinaturas' });
  }
}
