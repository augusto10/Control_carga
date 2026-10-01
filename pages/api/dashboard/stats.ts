import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);
    const fimHoje = endOfDay(hoje);
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);

    const [
      notasHoje, 
      notasMes,
      controlesHoje,
      controlesMes,
      pedidosHoje,
      pedidosMes
    ] = await Promise.all([
      prisma.notaFiscal.count({
        where: {
          dataCriacao: {
            gte: inicioHoje,
            lte: fimHoje
          }
        }
      }),
      prisma.notaFiscal.count({
        where: {
          dataCriacao: {
            gte: inicioMes,
            lte: fimMes
          }
        }
      }),
      prisma.controleCarga.count({
        where: {
          dataCriacao: {
            gte: inicioHoje,
            lte: fimHoje
          }
        }
      }),
      prisma.controleCarga.count({
        where: {
          dataCriacao: {
            gte: inicioMes,
            lte: fimMes
          }
        }
      }),
      prisma.pedido.count({
        where: {
          dataCriacao: {
            gte: inicioHoje,
            lte: fimHoje
          }
        }
      }),
      prisma.pedido.count({
        where: {
          dataCriacao: {
            gte: inicioMes,
            lte: fimMes
          }
        }
      })
    ]);

    return res.status(200).json({
      notasHoje,
      notasMes,
      controlesHoje,
      controlesMes,
      pedidosHoje,
      pedidosMes
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
