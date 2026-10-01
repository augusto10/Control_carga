import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { controleId, notasIds } = req.body;

    if (!controleId || !notasIds || !Array.isArray(notasIds)) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    await prisma.controleCarga.update({
      where: { id: controleId },
      data: {
        notas: {
          connect: notasIds.map((id: string) => ({ id }))
        }
      }
    });

    return res.status(200).json({ message: 'Notas vinculadas com sucesso' });
  } catch (error) {
    console.error('Erro ao vincular notas:', error);
    return res.status(500).json({ message: 'Erro ao vincular notas' });
  }
}
