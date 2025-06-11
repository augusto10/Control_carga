import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, valor } = req.body;
      
      const nota = await prisma.notaFiscal.create({
        data: {
          codigo,
          numeroNota,
          valor,
        },
      });
      
      res.status(200).json(nota);
    } catch (error) {
      console.error('Erro ao criar nota:', error);
      res.status(500).json({ error: 'Erro ao salvar nota fiscal' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
