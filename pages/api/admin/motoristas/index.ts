import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const motoristas = await prisma.motorista.findMany({
      orderBy: {
        nome: 'asc',
      },
    });

    return res.status(200).json(motoristas);
  } catch (error) {
    console.error('Erro ao buscar motoristas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
