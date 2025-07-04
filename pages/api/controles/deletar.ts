import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { controleId } = req.body;

  if (!controleId) {
    return res.status(400).json({ error: 'O ID do controle é obrigatório.' });
  }

  try {
    const controle = await prisma.controleCarga.findUnique({
      where: { id: controleId },
    });

    if (!controle) {
      return res.status(404).json({ error: 'Controle não encontrado.' });
    }

    if (controle.finalizado) {
      return res.status(403).json({ error: 'Controles finalizados não podem ser excluídos.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Desvincular todas as notas fiscais do controle
      await tx.notaFiscal.updateMany({
        where: { controleId: controleId },
        data: { controleId: null },
      });

      // 2. Excluir o controle
      await tx.controleCarga.delete({
        where: { id: controleId },
      });
    });

    res.status(200).json({ message: 'Controle excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir controle:', error);
    res.status(500).json({ error: 'Erro interno ao excluir o controle.' });
  }
}
