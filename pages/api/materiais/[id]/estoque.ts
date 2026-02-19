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

    // Permissão (Admin/Gerente)
    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
      return res.status(403).json({ error: 'Sem permissão para adicionar estoque' });
    }

    const { quantidade, observacao } = req.body as { quantidade?: number; observacao?: string };

    if (!quantidade || quantidade <= 0 || !Number.isFinite(quantidade)) {
      return res.status(400).json({ error: 'Quantidade deve ser um número positivo' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.materialEstoque.findUnique({ where: { id }, select: { id: true, quantidadeEstoque: true } });
      if (!material) {
        throw new Error('Material não encontrado');
      }

      const quantidadeAntes = material.quantidadeEstoque;
      const quantidadeDepois = quantidadeAntes + quantidade;

      const atualizado = await tx.materialEstoque.update({
        where: { id },
        data: {
          quantidadeEstoque: {
            increment: quantidade
          }
        }
      });

      await tx.historicoEstoque.create({
        data: {
          materialId: id,
          tipo: 'ENTRADA',
          quantidade,
          quantidadeAntes,
          quantidadeDepois,
          usuarioId: decoded.id,
          observacao: observacao || 'Entrada manual de estoque'
        }
      });

      return atualizado;
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao adicionar estoque:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}



