import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { controleId, notas, ...dadosAtualizacao } = req.body;

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
      return res.status(403).json({ error: 'Controles finalizados não podem ser editados.' });
    }

    const notasParaManterIds = Array.isArray(notas) ? notas.map((n: { id: string }) => n.id) : [];

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza os dados do controle
      await tx.controleCarga.update({
        where: { id: controleId },
        data: {
          ...dadosAtualizacao,
          qtdPallets: dadosAtualizacao.qtdPallets !== undefined ? Number(dadosAtualizacao.qtdPallets) : undefined,
        },
      });

      // 2. Pega todas as notas atualmente vinculadas
      const notasAtuais = await tx.notaFiscal.findMany({
        where: { controleId: controleId },
      });
      const notasAtuaisIds = notasAtuais.map(n => n.id);

      // 3. Desvincula as notas que foram removidas
      const notasParaDesvincularIds = notasAtuaisIds.filter(id => !notasParaManterIds.includes(id));
      if (notasParaDesvincularIds.length > 0) {
        await tx.notaFiscal.updateMany({
          where: {
            id: { in: notasParaDesvincularIds },
          },
          data: {
            controleId: null,
          },
        });
      }
    });

    const resultadoFinal = await prisma.controleCarga.findUnique({
        where: { id: controleId },
        include: { notas: true }
    });

    res.status(200).json(resultadoFinal);
  } catch (error) {
    console.error('Erro ao atualizar controle:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar o controle.' });
  }
}
