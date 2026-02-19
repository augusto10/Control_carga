import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { controleId, notasIds } = req.body as { controleId: string; notasIds: string[] };
    if (!controleId || !Array.isArray(notasIds)) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    await prisma.notaFiscal.updateMany({
      where: { id: { in: notasIds } },
      data: { controleId },
    });

    res.status(200).json({ message: 'Notas vinculadas com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao vincular notas' });
  }
}
