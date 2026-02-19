import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
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

    // Verificar permissão (apenas ADMIN/GERENTE)
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
      return res.status(403).json({ error: 'Sem permissão para rejeitar solicitações' });
    }

    // Buscar solicitação
    const solicitacao = await prisma.solicitacaoMaterial.findUnique({
      where: { id }
    });

    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (solicitacao.status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Solicitação já foi processada' });
    }

    const { motivoRejeicao } = req.body;

    if (!motivoRejeicao) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    // Atualizar solicitação
    const solicitacaoAtualizada = await prisma.solicitacaoMaterial.update({
      where: { id },
      data: {
        status: 'REJEITADA',
        aprovadorId: decoded.id,
        dataAprovacao: new Date(),
        motivoRejeicao
      },
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

    return res.status(200).json(solicitacaoAtualizada);

  } catch (error: any) {
    console.error('Erro ao rejeitar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
