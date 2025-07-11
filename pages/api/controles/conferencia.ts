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
    // 1. Encontrar o pedido para obter o controleId
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido || !pedido.controleId) {
      return res.status(404).json({ error: 'Pedido não encontrado ou não associado a um controle' });
    }

    // 2. Atualizar o ControleCarga associado
    const updatedControle = await prisma.controleCarga.update({
      where: { id: pedido.controleId },
      data: {
        conferenciaRealizada: true,
        dataConferencia: new Date(),
        conferenteId: conferenteId, // Usando o ID do usuário autenticado
        pedido100: pedido100 === 'sim', // Corrigido para comparar com 'sim'
        inconsistencia: inconsistencia === 'sim', // Corrigido para comparar com 'sim'
        motivosInconsistencia: inconsistencia === 'sim' ? motivosInconsistencia : [], // Salva motivos apenas se houver inconsistência
      },
    });

    res.status(200).json(updatedControle);
  } catch (error) {
    console.error('Erro ao salvar a conferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
