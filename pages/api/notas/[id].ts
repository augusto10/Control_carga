import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const nota = await prisma.notaFiscal.findUnique({
        where: { id },
        include: { controle: true }
      });

      if (!nota) {
        return res.status(404).json({ message: 'Nota fiscal não encontrada' });
      }

      return res.status(200).json(nota);
    } catch (error) {
      console.error('Erro ao buscar nota fiscal:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.notaFiscal.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Nota fiscal deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar nota fiscal:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        codigo,
        numeroNota,
        volumes,
        controleId,
        usuarioId
      } = req.body;

      const updatedNota = await prisma.notaFiscal.update({
        where: { id },
        data: {
          codigo,
          numeroNota,
          volumes,
          controleId,
          usuarioId
        },
        include: { controle: true }
      });

      return res.status(200).json(updatedNota);
    } catch (error) {
      console.error('Erro ao atualizar nota fiscal:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
