import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID é obrigatório' });
    }

    await prisma.motorista.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Motorista excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir motorista:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
