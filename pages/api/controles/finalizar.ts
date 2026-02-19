import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { controleId } = req.body as { controleId: string };
    if (!controleId) {
      return res.status(400).json({ error: 'controleId é obrigatório' });
    }

    await prisma.controleCarga.update({
      where: { id: controleId },
      data: { finalizado: true },
    });

    res.status(200).json({ message: 'Controle finalizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao finalizar controle' });
  }
}
