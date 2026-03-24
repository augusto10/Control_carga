import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const hoje = new Date();
    const inicio = startOfDay(hoje);
    const fim = endOfDay(hoje);

    const [notasHoje, controlesHoje, pedidosHoje, controlesPendentes, totalNotas, totalControles] = await Promise.all([
      prisma.notaFiscal.count({
        where: {
          dataCriacao: {
            gte: inicio,
            lte: fim
          }
        }
      }),
      prisma.controleCarga.count({
        where: {
          dataCriacao: {
            gte: inicio,
            lte: fim
          }
        }
      }),
      prisma.pedido.count({
        where: {
          dataCriacao: {
            gte: inicio,
            lte: fim
          }
        }
      }),
      prisma.controleCarga.count({
        where: {
          finalizado: false
        }
      }),
      prisma.notaFiscal.count(),
      prisma.controleCarga.count()
    ]);

    return res.status(200).json({
      notasHoje,
      controlesHoje,
      pedidosHoje,
      controlesPendentes,
      totalNotas,
      totalControles
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de hoje:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
