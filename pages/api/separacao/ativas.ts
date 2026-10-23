import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withTotemOrAuth } from '@/lib/middleware/withTotemOrAuth';
import prisma from '@/lib/prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const ativas = await prisma.pedidos.findMany({
      where: { status: 'EM_SEPARACAO' },
      select: {
        id: true,
        pedidoId: true,
        dataAssociacao: true,
        jobId: true,
        usuario: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { dataAssociacao: 'asc' },
    });

    return res.status(200).json({ success: true, ativas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}

export default withTotemOrAuth(handler);
