import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const solicitacao = await prisma.solicitacaoMaterial.findUnique({
        where: { id },
        include: {
          itens: {
            include: {
              material: true
            }
          },
          aprovador: {
            select: {
              nome: true
            }
          },
          solicitante: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        }
      });

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      const isAdmin = ['ADMIN', 'GERENTE'].includes(req.user.tipo);
      if (!isAdmin && solicitacao.solicitanteId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      return res.status(200).json(solicitacao);
    } catch (error) {
      console.error('Erro ao buscar solicitação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const solicitacao = await prisma.solicitacaoMaterial.findUnique({
        where: { id }
      });

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      const isAdmin = ['ADMIN', 'GERENTE'].includes(req.user.tipo);
      if (!isAdmin && solicitacao.solicitanteId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      if (solicitacao.status !== 'PENDENTE') {
        return res.status(400).json({ error: 'Só é possível excluir solicitações pendentes' });
      }

      await prisma.solicitacaoMaterial.delete({
        where: { id }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
