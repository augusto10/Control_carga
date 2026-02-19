import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Autenticação
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET || 'secret');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
    }

    // GET - Obter solicitação específica
    if (req.method === 'GET') {
      const solicitacao = await prisma.solicitacaoMaterial.findUnique({
        where: { id },
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true }
          },
          aprovador: {
            select: { id: true, nome: true, email: true }
          },
          itens: {
            include: {
              material: true
            }
          }
        }
      });

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Verificar se o usuário pode ver esta solicitação
      if (!['ADMIN', 'GERENTE'].includes(usuario.tipo) && solicitacao.solicitanteId !== decoded.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      return res.status(200).json(solicitacao);
    }

    // DELETE - Excluir solicitação (apenas ADMIN)
    if (req.method === 'DELETE') {
      // Verificar se o usuário é ADMIN
      if (usuario.tipo !== 'ADMIN') {
        return res.status(403).json({
          error: 'Acesso negado. Apenas administradores podem excluir solicitações de materiais.'
        });
      }

      // Verificar se a solicitação existe
      const solicitacao = await prisma.solicitacaoMaterial.findUnique({
        where: { id }
      });

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Excluir a solicitação (os itens serão excluídos automaticamente devido às constraints)
      await prisma.solicitacaoMaterial.delete({
        where: { id }
      });

      return res.status(200).json({
        message: 'Solicitação excluída com sucesso'
      });
    }

    // Método não permitido
    return res.status(405).json({
      error: `Método ${req.method} não permitido`
    });

  } catch (error) {
    console.error('Erro na API de solicitações de material:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}
