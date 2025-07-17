import { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // O ID do conferente agora vem do token JWT, injetado pelo middleware withAuth
  const conferenteId = req.user.id;
  const { pedidoId, pedido100, inconsistencia, motivosInconsistencia } = req.body;

  if (!pedidoId) {
    return res.status(400).json({ error: 'ID do Pedido é obrigatório' });
  }

  try {
    // 1. Verificar se já existe um PedidoConferido para este pedido
    let pedidoConferido = await prisma.pedidoConferido.findUnique({
      where: { pedidoId: pedidoId },
    });

    if (pedidoConferido) {
      // 2. Atualizar o PedidoConferido existente
      pedidoConferido = await prisma.pedidoConferido.update({
        where: { id: pedidoConferido.id },
        data: {
          conferenciaRealizada: true,
          dataConferencia: new Date(),
          conferenteId: conferenteId,
          pedido100: pedido100 === 'sim',
          inconsistencia: inconsistencia === 'sim',
          motivosInconsistencia: inconsistencia === 'sim' ? motivosInconsistencia : [],
        },
      });
    } else {
      // 3. Criar novo PedidoConferido
      pedidoConferido = await prisma.pedidoConferido.create({
        data: {
          pedidoId: pedidoId,
          conferenciaRealizada: true,
          dataConferencia: new Date(),
          conferenteId: conferenteId,
          pedido100: pedido100 === 'sim',
          inconsistencia: inconsistencia === 'sim',
          motivosInconsistencia: inconsistencia === 'sim' ? motivosInconsistencia : [],
        },
      });
    }

    res.status(200).json(pedidoConferido);
  } catch (error) {
    console.error('Erro ao salvar a conferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
