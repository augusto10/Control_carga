import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const isAdmin = ['ADMIN', 'GERENTE'].includes(req.user.tipo);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const motivoRejeicao = typeof req.body?.motivoRejeicao === 'string' ? req.body.motivoRejeicao.trim() : '';
  if (!motivoRejeicao) {
    return res.status(400).json({ error: 'Informe o motivo da rejeição' });
  }

  try {
    const solicitacao = await prisma.solicitacaoMaterial.findUnique({
      where: { id }
    });

    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (solicitacao.status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Solicitação já foi processada' });
    }

    await prisma.solicitacaoMaterial.update({
      where: { id },
      data: {
        status: 'REJEITADA',
        motivoRejeicao,
        dataAprovacao: new Date(),
        aprovadorId: req.user.id
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
