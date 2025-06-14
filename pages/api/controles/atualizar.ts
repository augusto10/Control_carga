import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { controleId, motorista, responsavel, cpfMotorista, transportadora, numeroManifesto, qtdPallets, observacao } = req.body as any;

    if (!controleId || !motorista?.trim() || !responsavel?.trim() || !cpfMotorista?.trim() || !transportadora) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    await prisma.controleCarga.update({
      where: { id: controleId },
      data: {
        motorista,
        responsavel,
        cpfMotorista,
        transportadora,
        ...(numeroManifesto ? { numeroManifesto } : {}),
        ...(qtdPallets !== undefined ? { qtdPallets: Number(qtdPallets) || 0 } : {}),
        ...(observacao !== undefined ? { observacao } : {}),
      } as any,
    });

    res.status(200).json({ message: 'Controle atualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar controle' });
  }
}
