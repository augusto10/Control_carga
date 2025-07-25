import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { usuarioId } = req.query;

    const whereClause = usuarioId ? { usuarioId: usuarioId as string } : {};

    const historico = await prisma.historicoPontuacao.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true
          }
        }
      },
      orderBy: { dataAcao: 'desc' },
      take: 50 // Limitar a 50 registros mais recentes
    });

    res.status(200).json({ historico });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
