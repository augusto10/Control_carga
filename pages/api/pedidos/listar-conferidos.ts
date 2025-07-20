import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { dataInicio, dataFim, status } = req.query;
    
    const where: any = {
      conferido: { isNot: null } // Apenas pedidos conferidos
    };

    // Filtrar por data se fornecida
    if (dataInicio && dataFim) {
      where.dataCriacao = {
        gte: new Date(dataInicio as string),
        lte: new Date(dataFim as string)
      };
    }

    // Filtrar por status se fornecido
    if (status === 'com-inconsistencia') {
      where.conferido = {
        ...where.conferido,
        inconsistencia: true
      };
    } else if (status === 'sem-inconsistencia') {
      where.conferido = {
        ...where.conferido,
        inconsistencia: false
      };
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        controle: {
          include: {
            notas: true
          }
        },
        conferido: {
          include: {
            conferente: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });

    res.status(200).json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos conferidos:', error);
    res.status(500).json({ 
      error: 'Erro ao listar pedidos conferidos',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
