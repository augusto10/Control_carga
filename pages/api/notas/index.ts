import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { start, end } = req.query;
      let where = {} as any;
      if (start || end) {
        where.dataCriacao = {};
        if (start) {
          where.dataCriacao.gte = new Date(`${start}T00:00:00`);
        }
        if (end) {
          where.dataCriacao.lte = new Date(`${end}T23:59:59`);
        }
      }
      const notas = await prisma.notaFiscal.findMany({ where });
      res.status(200).json(notas);
    } catch (error) {
      console.error('Erro ao listar notas:', error);
      res.status(500).json({ error: 'Erro ao listar notas' });
    }
  } else if (req.method === 'POST') {
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
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
