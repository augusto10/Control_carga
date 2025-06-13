import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, valor } = req.body;
      
      // Lógica para adicionar nota
      const controle = await prisma.controleCarga.findFirst({
        where: { dataCriacao: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { dataCriacao: 'desc' }
      });

      if (!controle) {
        throw new Error('Nenhum controle encontrado nas últimas 24 horas');
      }

      const newNota = await prisma.notaFiscal.create({
        data: {
          codigo,
          numeroNota,
          valor,
          controleId: controle.id
        }
      });

      res.status(200).json(newNota);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, statusCode: 500 } });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
