import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const controle = await prisma.controleCarga.findUnique({
        where: { id },
        include: { notas: true }
      });

      if (!controle) {
        return res.status(404).json({ message: 'Controle não encontrado' });
      }

      return res.status(200).json(controle);
    } catch (error) {
      console.error('Erro ao buscar controle:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        motorista,
        responsavel,
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao,
        finalizado,
        cpfMotorista,
        placaVeiculo,
        qtdPalletsDevolvidos,
        qtdPalletsLevados,
        freteInformado,
        valorFrete
      } = req.body;

      // Validate transportadora if provided
      if (transportadora && !Object.values(Transportadora).includes(transportadora)) {
        return res.status(400).json({ message: 'Transportadora inválida' });
      }

      const updatedControle = await prisma.controleCarga.update({
        where: { id },
        data: {
          motorista,
          responsavel,
          transportadora: transportadora as Transportadora,
          numeroManifesto,
          qtdPallets: qtdPallets !== undefined ? Number(qtdPallets) : undefined,
          observacao,
          finalizado,
          cpfMotorista,
          placaVeiculo,
          qtdPalletsDevolvidos: qtdPalletsDevolvidos !== undefined ? Number(qtdPalletsDevolvidos) : undefined,
          qtdPalletsLevados: qtdPalletsLevados !== undefined ? Number(qtdPalletsLevados) : undefined,
          freteInformado: freteInformado !== undefined ? Boolean(freteInformado) : undefined,
          valorFrete: valorFrete !== undefined && valorFrete !== null && valorFrete !== '' ? Number(valorFrete) : undefined,
        },
        include: { notas: true }
      });

      return res.status(200).json(updatedControle);
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.controleCarga.delete({
        where: { id }
      });

      return res.status(204).end();
    } catch (error) {
      console.error('Erro ao deletar controle:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
