import { NextApiHandler, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware/withAuth';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Buscar conferências via PedidoConferido, que é onde os dados são realmente salvos
    const conferencias = await prisma.pedidoConferido.findMany({
      include: {
        pedido: {
          include: {
            controle: {
              include: {
                notas: true
              }
            }
          }
        },
        conferente: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: {
        dataConferencia: 'desc',
      },
    });

    res.status(200).json(conferencias);
  } catch (error) {
    console.error('Erro ao buscar relatório de conferências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export default withAuth(handler);
