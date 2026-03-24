import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const motorista = await prisma.motorista.findUnique({
        where: { id },
      });

      if (!motorista) {
        return res.status(404).json({ message: 'Motorista não encontrado' });
      }

      return res.status(200).json(motorista);
    } catch (error) {
      console.error('Erro ao buscar motorista:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nome, telefone, cpf, cnh, transportadoraId, tipo, ativo } = req.body;

      const motorista = await prisma.motorista.update({
        where: { id },
        data: {
          nome,
          telefone,
          cpf,
          cnh,
          transportadoraId,
          tipo,
          ativo,
        },
      });

      return res.status(200).json(motorista);
    } catch (error: any) {
      console.error('Erro ao atualizar motorista:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'CPF já cadastrado' });
      }
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.motorista.delete({
        where: { id },
      });

      return res.status(204).end();
    } catch (error) {
      console.error('Erro ao deletar motorista:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
