import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import prisma from '@/lib/prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const id = String(req.body?.id || '').trim();
    const pedidoId = Number(req.body?.pedidoId);

    if (!id && !Number.isFinite(pedidoId)) {
      return res.status(400).json({ success: false, message: 'Informe id ou pedidoId.' });
    }

    const ativa = await prisma.pedidos.findFirst({
      where: {
        status: 'EM_SEPARACAO',
        ...(id ? { id } : { pedidoId }),
      },
      select: { id: true },
    });

    if (!ativa) {
      return res.status(404).json({ success: false, message: 'Nenhuma separação ativa encontrada.' });
    }

    const atualizado = await prisma.pedidos.update({
      where: { id: ativa.id },
      data: { status: 'FINALIZADO', dataFim: new Date() },
      select: {
        id: true,
        pedidoId: true,
        status: true,
        dataFim: true,
        usuario: { select: { id: true, nome: true } },
      },
    });

    return res.status(200).json({ success: true, separacao: atualizado });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}

export default withAuth(handler);
