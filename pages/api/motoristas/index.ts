import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const motoristas = await prisma.motorista.findMany({
        orderBy: {
          nome: 'asc',
        },
      });

      return res.status(200).json(motoristas);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, telefone, cpf, cnh, transportadoraId, tipo } = req.body;

      if (!nome || !cpf || !transportadoraId) {
        return res.status(400).json({ message: 'Dados obrigatórios faltando' });
      }

      const motorista = await prisma.motorista.create({
        data: {
          nome,
          telefone,
          cpf,
          cnh,
          transportadoraId,
          tipo: tipo || 'MOTORISTA',
        },
      });

      return res.status(201).json(motorista);
    } catch (error: any) {
      console.error('Erro ao criar motorista:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'CPF já cadastrado' });
      }
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
