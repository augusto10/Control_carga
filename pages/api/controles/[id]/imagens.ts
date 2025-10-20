import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para resolver problemas de tipo
interface ControleCargaWithImages {
  id: string;
  imagens: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do controle inválido' });
    }

    const { imagens } = req.body;

    if (!Array.isArray(imagens)) {
      return res.status(400).json({ error: 'Imagens deve ser um array' });
    }

    // Verificar se o controle existe
    const controleExiste = await prisma.controleCarga.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!controleExiste) {
      return res.status(404).json({ error: 'Controle não encontrado' });
    }

    // Atualizar controle com as novas imagens usando type assertion
    const controleAtualizado = await (prisma.controleCarga.update as any)({
      where: { id },
      data: {
        imagens: imagens
      },
      select: {
        id: true,
        imagens: true
      }
    });

    res.status(200).json(controleAtualizado);

  } catch (error) {
    console.error('Erro ao atualizar imagens do controle:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
