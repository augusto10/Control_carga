import { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { pedidoId, pedido100, inconsistencia, motivosInconsistencia, observacoes } = req.body;
  const conferenteId = req.user.id;

  if (!pedidoId) {
    return res.status(400).json({ error: 'ID do Pedido é obrigatório' });
  }

  try {
    // Verificar se o pedido existe
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { controle: true }
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se já existe uma conferência para este pedido
    const conferenciaExistente = await prisma.pedidoConferido.findUnique({
      where: { pedidoId }
    });

    if (conferenciaExistente) {
      return res.status(400).json({ error: 'Este pedido já foi conferido' });
    }

    // Criar a conferência
    const conferencia = await prisma.pedidoConferido.create({
      data: {
        pedidoId,
        conferenteId,
        pedido100: pedido100 === 'sim',
        inconsistencia: inconsistencia === 'sim',
        motivosInconsistencia: inconsistencia === 'sim' ? motivosInconsistencia : [],
        observacoes: observacoes || null
      },
      include: {
        pedido: true,
        conferente: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    });

    // Atualizar o pedido para vincular à conferência
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        conferido: {
          connect: { id: conferencia.id }
        }
      }
    });

    // Se o pedido estiver vinculado a um controle, marcar como conferido
    if (pedido.controle && pedido.controleId && typeof pedido.controleId === 'string') {
      await prisma.controleCarga.update({
        where: { id: pedido.controleId },
        data: {
          // Atualizar apenas campos que existem no modelo ControleCarga
          observacao: `Conferência realizada em ${new Date().toISOString()}`
        }
      });
    }

    res.status(200).json({
      success: true,
      data: conferencia,
      message: 'Conferência registrada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao registrar conferência:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao registrar conferência',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default withAuth(handler);
